# todo.tese
Automation Code Task for microservice-app
This repository contains a suite of end-to-end tests for a TODO API. The tests cover various operations such as creating, listing, updating, and deleting TODOs, as well as stress testing and validation of edge cases.

Tests Included
Unauthorized Access

Verifies that accessing the TODOs endpoint without an authorization token returns a 401 Unauthorized status.
Create a New TODO

Tests the creation of a new TODO item and checks that the TODO is successfully added with the correct content and ID.
Create Duplicate TODO

Tests the creation of a new TODO with the same content as an existing one, ensuring that the server handles duplicates correctly by assigning a new ID.
Stress Test

Performs a stress test by creating a large number of TODO items (1000 in this case) and verifies that they are all created successfully.
List TODOs for a User

Retrieves and verifies the list of TODOs for a user based on the user ID from the JWT token, ensuring that all TODOs belong to the specified user.
Delete a Specific TODO

Tests the deletion of a TODO item with specific content and ensures that it is successfully removed from the list.
Delete All TODOs

Deletes all TODOs and verifies that the TODO list is empty afterward.
Retrieve TODOs After Deletion

Checks that no TODOs can be retrieved after all TODOs have been deleted.
Create TODO with Empty Content

Tests the creation of a TODO with empty content to ensure the API handles this scenario properly.
Invalid Token Test

Verifies that using an invalid token results in an appropriate error response.
Injection Attacks

Tests the API for vulnerabilities to injection attacks by sending malicious input data.
