import { test, expect } from "@playwright/test";
import { ToDoPage } from "../pages/todo-page";
import { faker } from '@faker-js/faker';



test.describe('Test Suite', () => {
    let toDoPage: ToDoPage;
    test.beforeAll(async ({ browser }) => {
        let page = await browser.newPage();
        toDoPage = new ToDoPage(page);
        await toDoPage.goto();
    });

    test('New todo appears last on list', async () => {
        let newItem = faker.lorem.sentence();
        let newItem2 = faker.lorem.sentence();
        
        await toDoPage.createNew(newItem);
        expect(await toDoPage.getItemCount()).toEqual(1);
        expect(await toDoPage.getLastItem()).toEqual(newItem);

        await toDoPage.createNew(newItem2);
        expect(await toDoPage.getItemCount()).toEqual(2);
        expect(await toDoPage.getLastItem()).toEqual(newItem2);

    });

    test('Modify todo item', async () => {
        let oldItem = faker.lorem.sentence();
        let updatedItem = faker.lorem.sentence();

        await toDoPage.createNew(oldItem);

        await toDoPage.editItem(oldItem, updatedItem);
        
        expect(await toDoPage.isItemPresent(oldItem)).toBeFalsy();
        expect(await toDoPage.isItemPresent(updatedItem)).toBeTruthy();
    });

    test('Delete todo item', async () => {
        let item = faker.lorem.sentence();
        
        await toDoPage.createNew(item);
        await toDoPage.delete(item);
        
        expect(await toDoPage.isItemPresent(item)).toBeFalsy();
    });
});