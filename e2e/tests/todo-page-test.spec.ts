import { test, expect } from "@playwright/test";
import { ToDoPage } from "../pages/todo-page";
import { faker } from '@faker-js/faker';


test.describe('Todo MVC Test Suite', () => {
    let toDoPage: ToDoPage;
    test.beforeAll(async ({ browser }) => {
        let page = await browser.newPage();
        toDoPage = new ToDoPage(page);
        await toDoPage.goto();
    });

    test('Newly added todo items appeara last on list', async () => {
        // generate 2 items
        let firstItem = faker.lorem.sentence();
        let secondItem = faker.lorem.sentence();
        
        // when I create a todo
        await toDoPage.createNew(firstItem);
        // then it appears last
        expect(await toDoPage.getItemCount()).toEqual(1);
        expect(await toDoPage.getLastItem()).toEqual(firstItem);

        // add another item to tests since if there is only a single item, it is always last
        await toDoPage.createNew(secondItem);
        expect(await toDoPage.getItemCount()).toEqual(2);
        expect(await toDoPage.getLastItem()).toEqual(secondItem);
    });

    test('Edit todo item', async () => {
        let oldItem = faker.lorem.sentence();
        let updatedItem = faker.lorem.sentence();

        // given I have created a todo item
        await toDoPage.createNew(oldItem);
        // when I edit it
        await toDoPage.editItem(oldItem, updatedItem);
        
        // then it gets updated
        expect(await toDoPage.isItemPresent(oldItem)).toBeFalsy();
        expect(await toDoPage.isItemPresent(updatedItem)).toBeTruthy();
    });

    test('Delete todo item', async () => {
        let toDoItem = faker.lorem.sentence();
        
        // given I have created a todo item
        await toDoPage.createNew(toDoItem);
        // when I delete it
        await toDoPage.delete(toDoItem);
        // then it is removed from my todo list
        expect(await toDoPage.isItemPresent(toDoItem)).toBeFalsy();
    });

    test('Mark as complete', async () => {
        let toDoItem = faker.lorem.sentence();
        
        // given I have created a new todo item
        await toDoPage.createNew(toDoItem);
        // when I mark it as complete
        await toDoPage.markAsComplete(toDoItem);

        // then it is marked with a green check mark
        expect(await toDoPage.isItemChecked(toDoItem)).toBeTruthy();
        // and it is crossed off my list
        expect(await toDoPage.isTextStrikeThrough(toDoItem)).toBeTruthy();
    });

    test('Only active items in active tab', async () => {
        let activeItem = faker.lorem.sentence();
        let completedItem = faker.lorem.sentence();
        
        // given I have marked a todo item as complete
        await toDoPage.createNew(activeItem);
        await toDoPage.createNew(completedItem);
        await toDoPage.markAsComplete(completedItem);

        // when I view the active tab
        await toDoPage.selectActiveTab();

        // then active todo items are shown 
        expect(await toDoPage.isItemPresent(activeItem)).toBeTruthy();
        expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
    });

    test('Clear completed items', async () => {
        let activeItem = faker.lorem.sentence();
        let completedItem = faker.lorem.sentence();
        await toDoPage.selectAllTab();
        
        // given I have marked a todo item as complete
        await toDoPage.createNew(activeItem);
        await toDoPage.createNew(completedItem);
        await toDoPage.markAsComplete(completedItem);

        // when I click clear completed
        await toDoPage.clearCompleted();

        // Then the completed todo item is removed from my todo list
        expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
        expect(await toDoPage.isItemPresent(activeItem)).toBeTruthy();
        // And the todo item is moved to the Completed list
        // bug?? if completed item is cleared, should it be in the completed tab?
        await toDoPage.selectCompletedTab();
        expect(await toDoPage.isItemPresent(completedItem)).toBeTruthy(); // test will fail here
        expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
    });
});