# Localizator

Localizator is a Node.js program that automates the process of generating localization files for different platforms (web, iOS, and Android) using data from a Google Spreadsheet.

## Prerequisites

Before running the program, make sure you have the following:

1. Node.js installed on your machine.
2. A Google Cloud Platform project with the Google Drive API enabled.
3. A `client_secret.json` file containing your Google Cloud Platform project credentials.

Step 2 and 3 can be done following those instructions: https://developers.google.com/drive/api/quickstart/nodejs

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/LivioGama/localizator.git
   ```

2. Navigate to the project directory:

   ```
   cd localizator
   ```

3. Install the dependencies:

   ```
   npm install
   ```

4. Place your `client_secret.json` file in the project directory.

## Usage

To run the program, use the following command:

```
node localizator.js [options]
```

### Options

- `--id`: Specify the ID of the Google Spreadsheet file to use for localization. If not provided, the program will prompt you to select a file from the list of available files.
- `--gid`: Specify the ID of the sheet within the Google Spreadsheet file to use for localization. If not provided, the program will use the first sheet.
- `--languages`: Specify a comma-separated list of languages to generate localization files for. Default is 'en'.
- `--platform`: Specify the platform for which to generate localization files. Valid options are 'web', 'ios', and 'android'. Default is 'web'.
- `--path`: Specify the output path for the generated localization files. Default is './'.
- `--keep_csv`: Keep the temporary CSV file after generating the localization files.

## Example

To generate localization files for the web platform using a specific Google Spreadsheet file and the languages 'en' and 'fr' into an app in a monorepo located at `apps/frontend/i18n`  run:

```
node localizator.js --path=../frontend/i18n --id YOUR_FILE_ID --languages en,fr
```

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- Co-created by [Livio Gamassia](https://github.com/LivioGama) and [Celian Moutafis](https://github.com/CelianMoutafis) and adapted to NodeJS.
- Uses the [Google Drive API](https://developers.google.com/drive/api/quickstart/nodejs) for accessing Google Spreadsheets.
