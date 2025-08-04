# Ise3 SmartPlan

An intelligent study planner that helps middle school students organize their assignments, track their progress, and stay motivated for their exams. It automatically schedules tasks, adjusts to daily progress, and offers a clear view of the study plan.

This project was built with React and TypeScript, and can be run in two modes:
1.  **Local Storage Mode:** All data is saved directly in your browser. It's simple, private, and works offline.
2.  **Google Cloud Mode:** All data is saved to a Google Sheet via Google Apps Script. This allows for features like a Teacher Dashboard and Class Dashboard where data can be shared.

## Features

-   **Automatic Study Planning:** Input your subjects, tasks, and deadlines, and the app generates a balanced, day-by-day study schedule.
-   **Intelligent Rescheduling:** The planning algorithm adapts to constraints like daily study time and maximum subjects per day, and can re-calculate the plan if things change.
-   **Progress Tracking:** Track completed pages and study time to monitor your progress towards your goals.
-   **Dashboard Views:** Get a quick overview of your overall progress on the main calendar screen.
-   **Teacher & Class Dashboards (Cloud Mode):** Teachers can view the progress of all students, and students can see a ranked overview of their class.
-   **Data Persistence:** Choose between local storage or cloud storage for your data.

## Getting Started

### Prerequisites

You just need a modern web browser. No complex setup is required to run the app in Local Storage Mode.

### Running the Application

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/onokomachi/ise3smartplan.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd ise3smartplan
    ```
3.  Open the `index.html` file in your web browser. That's it!

By default, the application will run in **Local Storage Mode**.

## Configuration for Google Cloud Mode

To enable cloud features (like the Teacher and Class Dashboards), you need to set up a Google Apps Script backend.

**Step 1: Create a Google Sheet**

1.  Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2.  Name it something like "SmartPlanData".

**Step 2: Create a Google Apps Script Project**

1.  In your new Google Sheet, go to `Extensions` > `Apps Script`.
2.  A new script editor will open. Delete any content in the `Code.gs` file.
3.  Copy the entire content of the `Code.gs` file from this repository and paste it into the script editor.
4.  Save the project (click the floppy disk icon).

**Step 3: Deploy the Script as a Web App**

1.  In the Apps Script editor, click the **Deploy** button in the top right, then select **New deployment**.
2.  Click the gear icon next to "Select type" and choose **Web app**.
3.  In the "Description" field, you can type "SmartPlan API v1".
4.  For "Execute as", select **Me**.
5.  For "Who has access", select **Anyone**. **Important:** This does *not* mean anyone can see your data. It just means anyone can *run the script* (i.e., use the app). The script itself controls data access.
6.  Click **Deploy**.
7.  Google will ask you to authorize the script. Click **Authorize access** and follow the prompts, selecting your Google account. You may see a "Google hasn't verified this app" warning. Click "Advanced" and then "Go to (your project name)".
8.  After authorizing, you will be shown a **Web app URL**. Copy this URL.

**Step 4: Update the Application Code**

1.  Open the `services/gasService.ts` file in this project.
2.  Find the line with the `GAS_WEB_APP_URL` constant.
3.  Replace the placeholder URL with the URL you just copied from your deployment.
    ```typescript
    // Replace this with your own URL from Step 3
    const GAS_WEB_APP_URL: string = 'YOUR_NEW_WEB_APP_URL';
    ```
4.  Save the file.

Now, when you open `index.html`, the app will be running in Google Cloud Mode, and all data will be saved to your Google Sheet.
