import { Locator, Page } from '@playwright/test';

export class ToDoPage {
  readonly page: Page;
  readonly newToDo: Locator;
  readonly url: string = "https://todomvc.com/examples/react/#/";
  readonly toDoListItems: Locator;
  readonly itemCount: Locator;
  readonly listItemEdit: Locator;
  readonly listItem: string;
  

  constructor(page: Page) {
    this.page = page;
    this.newToDo = page.locator("//input[@class='new-todo']");
    this.toDoListItems = page.locator("//div[@class='view']/label");
    this.itemCount = page.locator("//span[@class='todo-count']/strong");
    this.listItemEdit = page.locator("//li[@class='editing']/input");
    //this.listItem = `//ul/li/label[text()='${}']`
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

  async getItemCount() {
    if (! await this.itemCount.isVisible()) return 0;
    return parseInt(await this.itemCount.innerText());
  }

  private async getItem(itemName: string) {
    return this.page.locator(`//ul[@class='todo-list']/li//label[text()='${itemName}']`);
  }

  async editItem(oldItemName: string, updatedItemName: string) {
    await (await this.getItem(oldItemName)).dblclick();

    await this.listItemEdit.clear();
    await this.listItemEdit.type(updatedItemName);
    await this.page.keyboard.press("Enter");
  }

  async isItemPresent(itemName: string) {
    return await (await this.getItem(itemName)).isVisible();
  }

  async delete(itemName: string) {
    await (await this.getItem(itemName)).hover();
    // TODO clean this up. create a locator???
    await this.page.locator(`//ul[@class='todo-list']/li//label[text()='${itemName}']/following-sibling::button[@class='destroy']`).click();
  }
}