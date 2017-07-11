import * as vscode from 'vscode';
import * as fs from 'fs';

import { UpsConfig } from './models/UpsConfig';

const rootPath = vscode.workspace.rootPath;
const configFilePath = rootPath + '/upsource.json';
const defaultSettings: UpsConfig = {
    url: '',
    login: '',
    password: '',
    projectId: ''
};

function getConfig(): Promise<UpsConfig> {
    return new Promise<UpsConfig>((resolve, reject) => {
        fs.access(configFilePath, fs.constants.R_OK, err => {
            if (err) {
                vscode.window.showErrorMessage('upsource.json is not readable.');
                reject(err);
                return;
            }

            fs.readFile(configFilePath, 'utf8', function(err, data) {
                if (err) reject(err);
                else resolve(<UpsConfig>JSON.parse(data));
            });
        });
    });
}

function setup() {
    let question = 'Please enter your ',
        steps = [
            { prompt: question + 'Upsource URL', placeHolder: 'URL', password: false },
            {
                prompt: question + 'Login identifier',
                placeHolder: 'Login identifier',
                password: false
            },
            { prompt: question + 'Password', placeHolder: 'Password', password: true },
            { prompt: question + 'Project ID', placeHolder: 'Project ID', password: false }
        ],
        settings = defaultSettings;

    vscode.window.showInputBox(steps[0]).then(input => {
        if (typeof input == 'undefined') return;
        settings.url = input;
        
        vscode.window.showInputBox(steps[1]).then(input => {
            if (typeof input == 'undefined') return;
            settings.login = input;
            
            vscode.window.showInputBox(steps[2]).then(input => {
                if (typeof input == 'undefined') return;
                settings.password = input;
                
                vscode.window.showInputBox(steps[3]).then(input => {
                    if (typeof input == 'undefined') return;
                    settings.projectId = input;
                    

                    createAndOpenConfigFileIfNotExists(settings);
                });
            });
        });
    });
}

function createAndOpenConfigFileIfNotExists(settings?: UpsConfig) {
    let contents = JSON.stringify(settings || defaultSettings);

    fs.access(configFilePath, fs.constants.F_OK, err => {
        if (!err) {
            vscode.window.showInformationMessage('upsource.json already exists.');
            showFileInTextEditor(configFilePath);
            return;
        }

        fs.writeFile(configFilePath, contents, 'utf8', err => {
            showFileInTextEditor(configFilePath);
            vscode.window.showInformationMessage('upsource.json has been created successfully.');
        });
    });
}

function showFileInTextEditor(filePath): Promise<vscode.TextDocument> {
    return new Promise<vscode.TextDocument>((resolve, reject) => {
        vscode.workspace.openTextDocument(filePath).then(
            (textDocument: vscode.TextDocument) => {
                vscode.window.showTextDocument(textDocument);
                resolve(textDocument);
            },
            err => {
                reject(err);
            }
        );
    });
}

export default {
    get: getConfig,
    setup: setup
};
