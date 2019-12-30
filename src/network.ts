// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as frames from './frames';
import { assert } from './helper';

export type NetworkCookie = {
  name: string,
  value: string,
  domain: string,
  path: string,
  expires: number,
  httpOnly: boolean,
  secure: boolean,
  session: boolean,
  sameSite: 'Strict' | 'Lax' | 'None'
};

export type SetNetworkCookieParam = {
  name: string,
  value: string,
  url?: string,
  domain?: string,
  path?: string,
  expires?: number,
  httpOnly?: boolean,
  secure?: boolean,
  sameSite?: 'Strict' | 'Lax' | 'None'
};

export function filterCookies(cookies: NetworkCookie[], urls: string[]): NetworkCookie[] {
  const parsedURLs = urls.map(s => new URL(s));
  // Chromiums's cookies are missing sameSite when it is 'None'
  return cookies.filter(c => {
    if (!parsedURLs.length)
      return true;
    for (const parsedURL of parsedURLs) {
      if (parsedURL.hostname !== c.domain)
        continue;
      if (!parsedURL.pathname.startsWith(c.path))
        continue;
      if ((parsedURL.protocol === 'https:') !== c.secure)
        continue;
      return true;
    }
    return false;
  });
}

export function rewriteCookies(cookies: SetNetworkCookieParam[]): SetNetworkCookieParam[] {
  return cookies.map(c => {
    assert(c.name, 'Cookie should have a name');
    assert(c.value, 'Cookie should have a value');
    assert(c.url || (c.domain && c.path), 'Cookie should have a url or a domain/path pair');
    assert(!(c.url && c.domain), 'Cookie should have either url or domain');
    assert(!(c.url && c.path), 'Cookie should have either url or domain');
    const copy = {...c};
    if (copy.url) {
      assert(copy.url !== 'about:blank', `Blank page can not have cookie "${c.name}"`);
      assert(!copy.url.startsWith('data:'), `Data URL page can not have cookie "${c.name}"`);
      const url = new URL(copy.url);
      copy.domain = url.hostname;
      copy.path = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
      copy.secure = url.protocol === 'https:';
    }
    return copy;
  });
}

function stripFragmentFromUrl(url: string): string {
  if (!url.indexOf('#'))
    return url;
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
}

export type Headers = { [key: string]: string };

export class Request {
  private _delegate: RequestDelegate | null;
  private _response: Response | null = null;
  _redirectChain: Request[];
  _finalRequest: Request;
  readonly _documentId?: string;
  private _failureText: string | null = null;
  private _url: string;
  private _resourceType: string;
  private _method: string;
  private _postData: string;
  private _headers: Headers;
  private _frame: frames.Frame;
  private _waitForResponsePromise: Promise<Response>;
  private _waitForResponsePromiseCallback: (value?: Response) => void;
  private _waitForFinishedPromise: Promise<Response | undefined>;
  private _waitForFinishedPromiseCallback: (value?: Response | undefined) => void;
  private _interceptionHandled = false;

  constructor(delegate: RequestDelegate | null, frame: frames.Frame | null, redirectChain: Request[], documentId: string,
    url: string, resourceType: string, method: string, postData: string, headers: Headers) {
    this._delegate = delegate;
    this._frame = frame;
    this._redirectChain = redirectChain;
    this._finalRequest = this;
    for (const request of redirectChain)
      request._finalRequest = this;
    this._documentId = documentId;
    this._url = stripFragmentFromUrl(url);
    this._resourceType = resourceType;
    this._method = method;
    this._postData = postData;
    this._headers = headers;
    this._waitForResponsePromise = new Promise(f => this._waitForResponsePromiseCallback = f);
    this._waitForFinishedPromise = new Promise(f => this._waitForFinishedPromiseCallback = f);
  }

  _setFailureText(failureText: string) {
    this._failureText = failureText;
    this._waitForFinishedPromiseCallback();
  }

  url(): string {
    return this._url;
  }

  resourceType(): string {
    return this._resourceType;
  }

  method(): string {
    return this._method;
  }

  postData(): string | undefined {
    return this._postData;
  }

  headers(): {[key: string]: string} {
    return this._headers;
  }

  response(): Response | null {
    return this._response;
  }

  async _waitForFinished(): Promise<Response | undefined> {
    return this._waitForFinishedPromise;
  }

  async _waitForResponse(): Promise<Response> {
    const response = await this._waitForResponsePromise;
    await response._finishedPromise;
    return response;
  }

  _setResponse(response: Response) {
    this._response = response;
    this._waitForResponsePromiseCallback(response);
    response._finishedPromise.then(() => this._waitForFinishedPromiseCallback(response));
  }

  frame(): frames.Frame | null {
    return this._frame;
  }

  isNavigationRequest(): boolean {
    return !!this._documentId;
  }

  redirectChain(): Request[] {
    return this._redirectChain.slice();
  }

  failure(): { errorText: string; } | null {
    if (this._failureText === null)
      return null;
    return {
      errorText: this._failureText
    };
  }

  async abort(errorCode: string = 'failed') {
    // Request interception is not supported for data: urls.
    if (this.url().startsWith('data:'))
      return;
    assert(this._delegate, 'Request Interception is not enabled!');
    assert(!this._interceptionHandled, 'Request is already handled!');
    this._interceptionHandled = true;
    await this._delegate.abort(errorCode);
  }

  async fulfill(response: { status: number; headers: {[key: string]: string}; contentType: string; body: (string | Buffer); }) {    // Mocking responses for dataURL requests is not currently supported.
    if (this.url().startsWith('data:'))
      return;
    assert(this._delegate, 'Request Interception is not enabled!');
    assert(!this._interceptionHandled, 'Request is already handled!');
    this._interceptionHandled = true;
    await this._delegate.fulfill(response);
  }

  async continue(overrides: { headers?: { [key: string]: string } } = {}) {
    // Request interception is not supported for data: urls.
    if (this.url().startsWith('data:'))
      return;
    assert(this._delegate, 'Request Interception is not enabled!');
    assert(!this._interceptionHandled, 'Request is already handled!');
    await this._delegate.continue(overrides);
  }
}

export type RemoteAddress = {
  ip: string,
  port: number,
};

type GetResponseBodyCallback = () => Promise<Buffer>;

export class Response {
  private _request: Request;
  private _contentPromise: Promise<Buffer> | null = null;
  _finishedPromise: Promise<Error | null>;
  private _finishedPromiseCallback: any;
  private _remoteAddress: RemoteAddress;
  private _status: number;
  private _statusText: string;
  private _url: string;
  private _headers: Headers;
  private _getResponseBodyCallback: GetResponseBodyCallback;

  constructor(request: Request, status: number, statusText: string, headers: Headers, remoteAddress: RemoteAddress, getResponseBodyCallback: GetResponseBodyCallback) {
    this._request = request;
    this._status = status;
    this._statusText = statusText;
    this._url = request.url();
    this._headers = headers;
    this._remoteAddress = remoteAddress;
    this._getResponseBodyCallback = getResponseBodyCallback;
    this._finishedPromise = new Promise(f => {
      this._finishedPromiseCallback = f;
    });
    this._request._setResponse(this);
  }

  _requestFinished(error?: Error) {
    this._finishedPromiseCallback.call(null, error);
  }

  remoteAddress(): RemoteAddress {
    return this._remoteAddress;
  }

  url(): string {
    return this._url;
  }

  ok(): boolean {
    return this._status === 0 || (this._status >= 200 && this._status <= 299);
  }

  status(): number {
    return this._status;
  }

  statusText(): string {
    return this._statusText;
  }

  headers(): object {
    return this._headers;
  }

  buffer(): Promise<Buffer> {
    if (!this._contentPromise) {
      this._contentPromise = this._finishedPromise.then(async error => {
        if (error)
          throw error;
        return this._getResponseBodyCallback();
      });
    }
    return this._contentPromise;
  }

  async text(): Promise<string> {
    const content = await this.buffer();
    return content.toString('utf8');
  }

  async json(): Promise<object> {
    const content = await this.text();
    return JSON.parse(content);
  }

  request(): Request {
    return this._request;
  }

  frame(): frames.Frame | null {
    return this._request.frame();
  }
}

export interface RequestDelegate {
  abort(errorCode: string): Promise<void>;
  fulfill(response: { status: number; headers: {[key: string]: string}; contentType: string; body: (string | Buffer); }): Promise<void>;
  continue(overrides: { url?: string; method?: string; postData?: string; headers?: { [key: string]: string; }; }): Promise<void>;
}

// List taken from https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml with extra 306 and 418 codes.
export const STATUS_TEXTS: { [status: string]: string } = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',
  '103': 'Early Hints',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',
  '208': 'Already Reported',
  '226': 'IM Used',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '306': 'Switch Proxy',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '414': 'URI Too Long',
  '415': 'Unsupported Media Type',
  '416': 'Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': 'I\'m a teapot',
  '421': 'Misdirected Request',
  '422': 'Unprocessable Entity',
  '423': 'Locked',
  '424': 'Failed Dependency',
  '425': 'Too Early',
  '426': 'Upgrade Required',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '431': 'Request Header Fields Too Large',
  '451': 'Unavailable For Legal Reasons',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  '505': 'HTTP Version Not Supported',
  '506': 'Variant Also Negotiates',
  '507': 'Insufficient Storage',
  '508': 'Loop Detected',
  '510': 'Not Extended',
  '511': 'Network Authentication Required',
};
