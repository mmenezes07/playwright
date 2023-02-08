import { Locator, Page } from '@playwright/test';

export class ToDoPage {
  readonly page: Page;
  readonly newToDo: Locator;
  readonly url: string = "https://todomvc.com/examples/react/#/";
  readonly toDoListItems: Locator;
  readonly itemCount: Locator;
  readonly listItemEdit: Locator;
  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly completedTab: Locator;
  

  constructor(page: Page) {
    this.page = page;
    this.newToDo = page.locator("//input[@class='new-todo']");
    this.toDoListItems = page.locator("//div[@class='view']/label");
    this.itemCount = page.locator("//span[@class='todo-count']/strong");
    this.listItemEdit = page.locator("//li[@class='editing']/input");
    this.allTab = page.locator("//a[@href='#/']");
    this.activeTab = page.locator("//a[@href='#/active']");
    this.completedTab = page.locator("//a[@href='#/completed']");
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

  async markAsComplete(itemName: string) {
    await this.toggle(itemName, true);
  }

  async markAsInComplete(itemName: string) {
    await this.toggle(itemName, false);
  }

  private async toggle(itemName: string, status: boolean) {
    await this.page.locator(`//ul[@class='todo-list']/li//label[text()='${itemName}']/preceding-sibling::input`).setChecked(status);
  }

  async isItemChecked(itemName: string) {
    return await this.page.locator(`//ul[@class='todo-list']/li//label[text()='${itemName}']/preceding-sibling::input`).isChecked();
  }

  async isTextStrikeThrough(itemName: string) {
    let label = await this.getItem(itemName);
    let textDecoration = await label.evaluate((element) =>
      window.getComputedStyle(element).getPropertyValue('text-decoration')
    );

    return textDecoration.includes('line-through');
  }

  async selectAllTab() {
    await this.allTab.click();
  }

  async selectActiveTab() {
    await this.activeTab.click();
  }

  async selectCompletedTab() {
    await this.completedTab.click();
  }
}