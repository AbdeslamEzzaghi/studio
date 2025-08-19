# AI-Powered Code Studio

This project is an AI-powered code studio built with Next.js. It provides an integrated environment for writing, testing, and debugging code with the assistance of AI models.
The studio includes a code editor, output panel, and dedicated panels for interacting with AI features like code explanation, debugging suggestions, and test case generation.

## Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## Project Description

The AI-Powered Code Studio aims to enhance the developer experience by integrating AI capabilities directly into the coding workflow. It provides a user-friendly interface where developers can write code, execute it, and leverage AI models for assistance with various tasks. The current implementation focuses on Python code execution and offers specific AI flows for code explanation, debugging, and generating test cases.

## Features

- **Code Editor:** A dedicated area for writing and editing code.
- **Output Panel:** Displays the results of code execution.
- **AI Assistant Panels:**
    - **Code Explanation:** Get explanations for selected code snippets.
    - **Debugging:** Receive suggestions for fixing errors in your code.
    - **Test Case Generation:** Generate potential test cases for your code.
- **Test Cases Input:** Input custom test cases for your code.
- **Test Results:** View the results of running your code against test cases.

## Technologies Used

- **Next.js:** The React framework used for building the user interface.
- **React:** The JavaScript library for building user interfaces.
- **TypeScript:** Adds static typing to JavaScript for improved code maintainability.
- **Tailwind CSS:** A utility-first CSS framework for styling.
- **Shadcn UI:** A collection of reusable components for building UIs.
- **Skulpt:** An in-browser implementation of Python, used for executing Python code directly in the browser.
- **Genkit:** Used for building and orchestrating AI flows.
- **OpenRouter:** Potentially used for accessing various AI models (check `src/ai/openrouter/simple-chat.ts`).

## Setup Instructions

1. **Clone the repository:**

