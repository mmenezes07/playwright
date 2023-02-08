import { test, expect } from "@playwright/test";
import { ToDoPage } from "../pages/todo-page";


test('New todo appears last on list', async ({ page }) => {
    let toDoPage: ToDoPage = new ToDoPage(page);
    let newItem = "test";

    toDoPage.goto();
    await toDoPage.createNew(newItem);
    expect(await toDoPage.getLastItem()).toEqual("newItem");
});