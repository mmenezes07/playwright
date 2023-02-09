import { test, expect } from "@playwright/test";
import { ToDoPage } from "../pages/todo-page";
import { faker } from '@faker-js/faker';


test.describe('Todo Test Suite', () => {
    let toDoPage: ToDoPage;
    test.beforeAll(async ({ browser }) => {
        let page = await browser.newPage();
        toDoPage = new ToDoPage(page);
        await toDoPage.goto();
    });

    test('Newly added todo items appear last on list', async () => {
        // generate 2 items
        let firstItem = faker.lorem.sentence();
        let secondItem = faker.lorem.sentence();

        await test.step('when I create a new todo item', async () => {
            await toDoPage.createNew(firstItem);
        });
        
        await test.step('then it appears last on my todo list', async () => {
            expect(await toDoPage.getItemCount()).toEqual(1);
            expect(await toDoPage.getLastItem()).toEqual(firstItem);
        });

        // add another item to tests since if there is only a single item, it is always last
        await test.step('then it appears last when there are multiple items', async () => {
            await toDoPage.createNew(secondItem);
            expect(await toDoPage.getItemCount()).toEqual(2);
            expect(await toDoPage.getLastItem()).toEqual(secondItem);
        });
    });

    test('Edit todo item', async () => {
        let oldItem = faker.lorem.sentence();
        let updatedItem = faker.lorem.sentence();

        await test.step('given I have created a todo item', async () => {
            await toDoPage.createNew(oldItem);
        });

        await test.step('when I edit it', async () => {
            await toDoPage.editItem(oldItem, updatedItem);
        });

        await test.step('then it gets updated with the new changes', async () => {
            expect(await toDoPage.isItemPresent(oldItem)).toBeFalsy();
            expect(await toDoPage.isItemPresent(updatedItem)).toBeTruthy();
        });
    });

    test('Delete todo item', async () => {
        let toDoItem = faker.lorem.sentence();
        
        await test.step('given I have created a todo item', async () => {
            await toDoPage.createNew(toDoItem);
        });
        
        await test.step('when I delete it', async () => {
            await toDoPage.delete(toDoItem);
        });
        
        await test.step('then it is removed from my todo list', async () => {
            expect(await toDoPage.isItemPresent(toDoItem)).toBeFalsy();
        });
    });

    test('Mark as complete', async () => {
        let toDoItem = faker.lorem.sentence();

        await test.step('given I have created a new todo item', async () => {
            await toDoPage.createNew(toDoItem);
        });

        await test.step('when I mark it as complete', async () => {
            await toDoPage.markAsComplete(toDoItem);
        });

        await test.step('then it is marked with a green check mark', async () => {
            expect(await toDoPage.isItemChecked(toDoItem)).toBeTruthy();
        });

        await test.step('and it is crossed off my list', async () => {
            expect(await toDoPage.isTextStrikeThrough(toDoItem)).toBeTruthy();
        });
        
    });

    test('Only active items in active tab', async () => {
        let activeItem = faker.lorem.sentence();
        let completedItem = faker.lorem.sentence();

        await test.step('given I have marked a todo item as complete', async () => {
            await toDoPage.createNew(activeItem);
            await toDoPage.createNew(completedItem);
            await toDoPage.markAsComplete(completedItem);
        });

        await test.step('when I view the active tab', async () => {
            await toDoPage.selectActiveTab();
        });

        await test.step('then active todo items are shown ', async () => {
            expect(await toDoPage.isItemPresent(activeItem)).toBeTruthy();
            expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
        });
    });

    test('Clear completed items', async () => {
        let activeItem = faker.lorem.sentence();
        let completedItem = faker.lorem.sentence();
        await toDoPage.selectAllTab();

        await test.step('given I have marked a todo item as complete', async () => {
            await toDoPage.createNew(activeItem);
            await toDoPage.createNew(completedItem);
            await toDoPage.markAsComplete(completedItem);
        });
        
        await test.step('when I click clear completed', async () => {
            await toDoPage.clearCompleted();
        });
 
        await test.step('Then the completed todo item is removed from my todo list', async () => {
            expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
            expect(await toDoPage.isItemPresent(activeItem)).toBeTruthy();
        });
        
        // bug?? if completed item is cleared, should it be in the completed tab?
        await test.step('And the todo item is moved to the Completed list', async () => {
            await toDoPage.selectCompletedTab();
            expect(await toDoPage.isItemPresent(completedItem)).toBeTruthy(); // test will fail here
            expect(await toDoPage.isItemPresent(completedItem)).toBeFalsy();
        });
    });
});