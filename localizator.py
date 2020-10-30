from __future__ import print_function

import argparse
import os
import os.path
import pickle

import translations
import urllib3
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    import apiclient
except ImportError:
    print("'import apiclient' failed; run: pip3 install google-api-python-client\n"
          "or manually on https://developers.google.com/api-client-library/python/start/installation")
    exit(-1)

try:
    import oauth2client
    from oauth2client import client
    from oauth2client import tools
    from oauth2client import file
except ImportError:
    print("'import oauth2client' failed; run: pip3 install oauth2client")
    exit(-1)

try:
    parser = argparse.ArgumentParser(description='Create localizable files')
    parser.add_argument('--id', help='provide file id to avoid prompt')
    parser.add_argument('--path', help='Path destination for *.lproj folders', default='./')
    parser.add_argument('--platform', choices=['ios', 'android'], help='Should be either ios or android', default='ios')
    parser.add_argument('--gid', help='Use the Google sheet ID from the end of the url link')
    parser.add_argument('--keep_csv', type=bool, help='Should keep the CSV file on the disk', default=False)
    args = parser.parse_args()
    flags = args
except ImportError:
    flags = None
    print("Cannot parse")

SCOPES = ['https://www.googleapis.com/auth/drive']
CLIENT_SECRET_FILE = 'client_secret.json'
APPLICATION_NAME = 'YOUR_PROJECT_NAME_GOES_HERE'


def get_credentials():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return creds


def get_files(service):
    results = service.files().list(fields='files(id, exportLinks)').execute()
    items = results.get('files', [])
    if not items:
        print('No files found.')
    else:
        return service, items


def main():
    if not os.path.exists(CLIENT_SECRET_FILE):
        print("'" + CLIENT_SECRET_FILE + "' file does not exist.\n"
                                         "Enable the API and save the '" + CLIENT_SECRET_FILE + "' file here.\n"
                                                                                                "https://console.developers.google.com/flows/enableapi?apiid=drive")
        exit(-1)

    credentials = get_credentials()
    print("Authorizing...")
    service = build('drive', 'v3', credentials=credentials)
    print("Listing files...")
    service, files = get_files(service)

    if args.id:
        for item in files:
            if item['id'] == args.id:
                file = item
        if not 'file' in locals():
            print("File with id '" + args.id + "' not found in files list.\n"
                                               "Notice: you need to load the file at least once in your browser, so it's visible in your files list.")
            exit(-1)
    else:
        i = 0
        for item in files:
            print("[" + str(i) + "] " + str(item['title']) + " - " + str(item['id']))
            i += 1
        isDigit = False
        while not isDigit:
            index = input("Select a file index: \n")
            isDigit = index.isdigit()
            if int(index) > len(files) or int(index) < 0:
                print("Invalid index supplied. Try again")
                isDigit = False
        file = files[int(index)]

    content = download_file(service, file, args.gid)
    filename = 'tmp.csv'
    csvf = open(filename, 'w')
    csvf.write(content.decode("utf-8"))
    csvf.close()

    if args.platform == 'ios':
        translations.translate(filename, args.path)
    elif args.platform == 'android':
        translations.translate_android(filename, args.path)
    else:
        print("Invalid platform. type --help for help")
    if not args.keep_csv:
        os.remove(filename)
    print("Success! Localization files for platform " + args.platform + " have been generated under '" + args.path + "'")


def download_file(service, drive_file, tab_id):
    download_url = drive_file['exportLinks']['text/csv'] + "&gid=" + tab_id
    print("Downloading " + download_url)
    resp, content = service._http.request(download_url)
    if resp.status == 200:
        return content
    else:
        print('HTTP error: %s' % resp.status)
        if args.gid:
            print('Maybe --gid is wrong?')
        exit(-1)


if __name__ == '__main__':
    main()
