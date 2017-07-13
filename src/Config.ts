import * as vscode from 'vscode';
import * as fs from 'fs';

import { UpsConfig } from './models/UpsConfig';

const rootPath = vscode.workspace.rootPath;
const configFilePath = rootPath + '/upsource.json';
    
function configFileExists(): boolean {
    return fs.existsSync(configFilePath);
}

function getConfig(): Promise<UpsConfig> {
    return new Promise<UpsConfig>((resolve, reject) => {
        if (configFileExists()) {
            vscode.window.showErrorMessage('upsource.json is not readable.');
            reject();
            return;
        }

        fs.readFile(configFilePath, 'utf8', function(err, data) {
            if (err) reject(err);
            else resolve(<UpsConfig>JSON.parse(data));
        });
    });
}

function setup() {
    let defaultConfig = <UpsConfig>vscode.workspace
            .getConfiguration()
            .get('upsource.defaultConfig'),
        settings = new UpsConfig(defaultConfig.url, defaultConfig.login, defaultConfig.projectId),
        question = 'Please enter your ',
        steps = [
            {
                prompt: question + 'Upsource URL',
                placeHolder: defaultConfig.url || 'URL',
                password: false
            },
            {
                prompt: question + 'login identifier',
                placeHolder: defaultConfig.login || 'login identifier',
                password: false
            },
            {
                prompt: question + 'password',
                placeHolder: 'Password',
                password: true
            },
            {
                prompt: question + 'project ID',
                placeHolder: defaultConfig.projectId || 'Project ID',
                password: false
            }
        ];

    vscode.window.showInputBox(steps[0]).then(input => {
        if (typeof input == 'undefined') return;
        if (input) settings.url = input;

        vscode.window.showInputBox(steps[1]).then(input => {
            if (typeof input == 'undefined') return;
            if (input) settings.login = input;

            vscode.window.showInputBox(steps[2]).then(input => {
                if (typeof input == 'undefined') return;
                if (input) settings.password = input;

                vscode.window.showInputBox(steps[3]).then(input => {
                    if (typeof input == 'undefined') return;
                    if (input) settings.projectId = input;

                    createAndOpenConfigFileIfNotExists(settings);
                });
            });
        });
    });
}

function createAndOpenConfigFileIfNotExists(settings: UpsConfig = new UpsConfig()) {
    let contents = JSON.stringify(settings);

    fs.access(configFilePath, fs.constants.F_OK, err => {
        if (!err) {
            vscode.window.showInformationMessage('upsource.json already exists.');
            showFileInTextEditor(configFilePath);
            return;
        }

        fs.writeFile(configFilePath, contents, { encoding: 'utf8' }, err => {
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
    setup: setup,
    fileExists: configFileExists
};
