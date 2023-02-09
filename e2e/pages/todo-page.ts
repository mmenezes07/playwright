import { Locator, Page } from '@playwright/test';


export class ToDoPage {
  private readonly page: Page;
  private readonly newToDo: Locator;
  private readonly toDoListItems: Locator;
  private readonly itemCount: Locator;
  private readonly listItemEdit: Locator;
  private readonly allTab: Locator;
  private readonly activeTab: Locator;
  private readonly completedTab: Locator;
  private readonly clearCompletedButton: Locator;
  private readonly url: string = "https://todomvc.com/examples/react/#/";
  
  constructor(page: Page) {
    this.page = page;
    this.newToDo = page.locator("//input[@class='new-todo']");
    this.toDoListItems = page.locator("//div[@class='view']/label");
    this.itemCount = page.locator("//span[@class='todo-count']/strong");
    this.listItemEdit = page.locator("//li[@class='editing']/input");
    this.allTab = page.locator("//a[@href='#/']");
    this.activeTab = page.locator("//a[@href='#/active']");
    this.completedTab = page.locator("//a[@href='#/completed']");
    this.clearCompletedButton = page.locator("//button[@class='clear-completed']");
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async createNew(title: string) {
    await this.newToDo.type(title);
    await this.pressEnter();
  }

  private async pressEnter() {
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

  async doubleClickItem(itemName: string) {
    await (await this.getItem(itemName)).dblclick();
  }

  async editItem(oldItemName: string, updatedItemName: string) {
    await this.doubleClickItem(oldItemName);

    await this.listItemEdit.clear();
    await this.listItemEdit.type(updatedItemName);
    await this.pressEnter();
  }

  async isItemPresent(itemName: string) {
    return await (await this.getItem(itemName)).isVisible();
  }

  async delete(itemName: string) {
    let itemLocator = await this.getItem(itemName);
    await itemLocator.hover(); // hover over the item for the delete button to appear
    let deleteButton = itemLocator.locator("//following-sibling::button[@class='destroy']")
    await deleteButton.click();
  }

  async markAsComplete(itemName: string) {
    await this.toggle(itemName, true);
  }

  async markAsActive(itemName: string) {
    await this.toggle(itemName, false);
  }

  private async toggle(itemName: string, status: boolean) {
    let itemLocator = await this.getItem(itemName);
    let toggleCheckbox = itemLocator.locator("//preceding-sibling::input")
    await toggleCheckbox.setChecked(status);
  }

  async isItemChecked(itemName: string) {
    let itemLocator = await this.getItem(itemName);
    let toggleCheckbox = itemLocator.locator("//preceding-sibling::input")

    return await toggleCheckbox.isChecked();
  }

  async isTextStruckThrough(itemName: string) {
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

  async clearCompleted() {
    await this.clearCompletedButton.click();
  }
}