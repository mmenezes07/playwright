import { Locator, Page } from '@playwright/test';

export class ToDoPage {
  readonly page: Page;
  readonly newToDo: Locator;
  readonly url: string = "https://todomvc.com/examples/react/#/";
  readonly toDoListItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newToDo = page.locator("//input[@class='new-todo']");
    this.toDoListItems = page.locator("//div[@class='view']/label");
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async createNew(title: string) {
    await this.newToDo.type(title);
    await this.page.keyboard.press("Enter");
  }

  async getLastItem() {
    return await this.toDoListItems.last().textContent();
  }
}