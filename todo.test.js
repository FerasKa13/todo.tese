const request = require('supertest');
const jwt = require('jsonwebtoken');

const baseUrlTodos = 'http://127.0.0.1:8082'; // Ensure the correct base URL for TODOs API

describe('TODO API End-to-End Tests via Backend API', () => {
    let authToken;
    let createdTodoId;
    const userId = 1; // Define userId to match the JWT payload
    const numberOfTodos = 1000; // Number of TODOs to create in the stress test

    // Generate the token using the same secret and expected payload structure as the server
    beforeAll(() => {
        // Ensure this matches the payload and secret the server expects
        const user = { username: 'Admin', id: userId, role: 'admin' }; // Add role if needed

        authToken = jwt.sign(user, 'foo', { expiresIn: '1h' }); // Include expiration if necessary
    });

    test('should return 401 Unauthorized when no token is provided', async () => {
        const response = await request(baseUrlTodos).get('/todos');
        console.log('Unauthorized Access Response:', response.status, response.body);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'invalid token');
    });

    test('should return 401 Unauthorized with an invalid token', async () => {
        const invalidToken = jwt.sign({ username: 'Invalid', id: userId }, 'wrong-secret', { expiresIn: '1h' });
        const response = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${invalidToken}`);
        console.log('Unauthorized Access with Invalid Token Response:', response.status, response.body);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'invalid token');
    });

    test('should create a new TODO and log the operation', async () => {
        const response = await request(baseUrlTodos)
            .post('/todos')
            .set('Authorization', `Bearer ${authToken}`) // Ensure token is sent in header
            .send({
                content: 'Complete E2E testing',
            });
        console.log('Create TODO Response:', response.status, response.body);

        // Check if the request was successful
        expect(response.status).toBe(200); // Ensure the server returns a 200 OK response
        expect(response.body).toHaveProperty('content', 'Complete E2E testing'); // Check the TODO content
        expect(response.body).toHaveProperty('id'); // Ensure the response has a TODO id

        // Save the ID for further operations
        createdTodoId = response.body.id;
    });

    test('should allow creating a new TODO with the same name as an existing one', async () => {
        const response = await request(baseUrlTodos)
            .post('/todos')
            .set('Authorization', `Bearer ${authToken}`) // Ensure token is sent in header
            .send({
                content: 'Complete E2E testing', // Same name as the previous TODO
            });
        console.log('Create Duplicate TODO Response:', response.status, response.body);

        // Check if the request was successful
        expect(response.status).toBe(200); // Ensure the server returns a 200 OK response

        // Check the TODO content and id to verify it's not the same TODO
        expect(response.body).toHaveProperty('content', 'Complete E2E testing'); // Check the content is correct
        expect(response.body).toHaveProperty('id'); // Ensure the response has a TODO id

        // The ID should be different from the previous TODO's ID
        expect(response.body.id).not.toBe(createdTodoId); // Ensure the new TODO is unique
    });

    test(`should handle creating ${numberOfTodos} TODOs`, async () => {
        const createTodoPromises = [];

        for (let i = 0; i < numberOfTodos; i++) {
            createTodoPromises.push(
                request(baseUrlTodos)
                    .post('/todos')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ content: `Stress Test TODO ${i}` })
            );
        }

        // Execute all requests in parallel
        const responses = await Promise.all(createTodoPromises);

        // Log results and check responses
        responses.forEach(response => {
            console.log('Create TODO Response:', response.status, response.body);
            expect(response.status).toBe(200); // Ensure all requests succeed
            expect(response.body).toHaveProperty('content'); // Check that each TODO has a content
            expect(response.body).toHaveProperty('id'); // Ensure each TODO has an ID
        });

        // Optionally, verify all TODOs were created by fetching and checking the list
        const listResponse = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        console.log('List TODOs Response:', listResponse.status, listResponse.body);
        expect(listResponse.status).toBe(200);

        const todos = listResponse.body;
        expect(todos.length).toBeGreaterThanOrEqual(numberOfTodos);
    });

    test('should return all TODOs for the given user ID from JWT', async () => {
        // Make a GET request to list all TODOs with the JWT in the Authorization header
        const response = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`); // Send the JWT token

        // Log the response for debugging purposes
        console.log('List TODOs Response:', response.status, response.body);

        // Check if the response status is 200 OK
        expect(response.status).toBe(200);

        // Check if the response body contains an array of TODOs
        const todos = response.body;
        expect(Array.isArray(todos)).toBe(true);

        // Optionally, log the list of TODOs to verify the content
        console.log('TODOs for user:', todos);

        // Ensure that all TODOs returned belong to the user with the ID from the JWT
        todos.forEach(todo => {
            expect(todo).toHaveProperty('userId', userId); // Assuming each TODO has a `userId` property
        });
    });

    test('should delete the TODO with content "Complete E2E testing"', async () => {
        // First, get the list of all TODOs
        const listResponse = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        console.log('List All TODOs Response:', listResponse.status, listResponse.body);
        expect(listResponse.status).toBe(200); // Ensure we successfully fetched the list

        const todos = listResponse.body;

        // Find the TODO with the content "Complete E2E testing"
        const todoToDelete = todos.find(t => t.content === 'Complete E2E testing');
        console.log('Found TODO to delete:', todoToDelete);
        expect(todoToDelete).toBeDefined(); // Ensure the TODO is found

        // Send a DELETE request for the found TODO
        const deleteResponse = await request(baseUrlTodos)
            .delete(`/todos/${todoToDelete.id}`) // Use the found TODO's ID
            .set('Authorization', `Bearer ${authToken}`);

        console.log('Delete TODO Response:', deleteResponse.status, deleteResponse.body);
        expect(deleteResponse.status).toBe(200); // Ensure the delete request was successful

        // Optionally, verify the deletion by checking that the TODO no longer exists
        const todosAfterDelete = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        const remainingTodos = todosAfterDelete.body;
        const deletedTodo = remainingTodos.find(t => t.id === todoToDelete.id);

        // Ensure the deleted TODO is no longer in the list
        expect(deletedTodo).toBeUndefined();
    });

    test('should delete all TODOs', async () => {
        const response = await request(baseUrlTodos)
            .delete('/todos') // Assume this endpoint deletes all TODOs
            .set('Authorization', `Bearer ${authToken}`);

        console.log('Delete All TODOs Response:', response.status, response.body);

        // Ensure the delete request was successful
        expect(response.status).toBe(200);

        // Optionally, verify deletion by checking the list of TODOs
        const todosResponse = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        const todos = todosResponse.body;

        // Ensure the list is empty
        expect(todos).toEqual([]); // Ensure no TODOs exist
    });

    test('should not retrieve any TODOs after deleting all', async () => {
        // First, ensure all TODOs are deleted
        await request(baseUrlTodos)
            .delete('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        // Then, attempt to retrieve the list of TODOs
        const response = await request(baseUrlTodos)
            .get('/todos')
            .set('Authorization', `Bearer ${authToken}`);

        console.log('Retrieve TODOs Response After Deletion:', response.status, response.body);
        expect(response.status).toBe(200);

        // Verify that the list of TODOs is empty
        const todos = response.body;
        expect(Array.isArray(todos)).toBe(true); // Ensure the response is an array
        expect(todos.length).toBe(0); // Ensure the array is empty
    });

    test('should handle creating a TODO with empty content', async () => {
        const response = await request(baseUrlTodos)
            .post('/todos')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ content: '' }); // Sending empty content
        console.log('Create TODO with Empty Content Response:', response.status, response.body);

        // Check if the request was unsuccessful and the response status is 400 Bad Request
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Content cannot be empty');
    });

    test('should be protected against SQL Injection attacks', async () => {
        const maliciousContent = "'); DROP TABLE todos; --"; // Example SQL Injection payload
        const response = await request(baseUrlTodos)
            .post('/todos')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ content: maliciousContent });
        console.log('SQL Injection Test Response:', response.status, response.body);

        // Check if the request was unsuccessful and the response status is 400 Bad Request
        expect(response.status).toBe(400); // Assuming SQL Injection will be caught and a bad request response is sent
        expect(response.body).toHaveProperty('message'); // Ensure there is an appropriate error message
    });
});
