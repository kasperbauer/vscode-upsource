import * as vscode from 'vscode';
import * as fs from 'fs';

import { UpsConfig } from './models/UpsConfig';

const { rootPath } = vscode.workspace;
const configFilePath = rootPath + '/upsource.json';

export default class Config {
    fileExists(): boolean {
        return fs.existsSync(configFilePath);
    }

    get(): Promise<UpsConfig> {
        return new Promise<UpsConfig>((resolve, reject) => {
            if (!this.fileExists()) {
                reject('upsource.json does not exist.');
                return;
            }

            fs.readFile(configFilePath, 'utf8', function(err, data) {
                if (err) reject(err);
                else resolve(<UpsConfig>JSON.parse(data));
            });
        });
    }

    setup() {
        let defaultConfig = <UpsConfig>vscode.workspace
                .getConfiguration()
                .get('upsource.defaultConfig'),
            settings = new UpsConfig(
                defaultConfig.url,
                defaultConfig.login,
                defaultConfig.projectId
            ),
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
                },
                {
                    prompt: question + 'reviewers comma separated',
                    placeHolder: 'Reviewers',
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

                        vscode.window.showInputBox(steps[4]).then(input => {
                            if (typeof input == 'undefined') return;
                            if (input) settings.reviewers = input.split(',').map(reviewer => reviewer.trim());

                            this.createAndOpenConfigFileIfNotExists(settings);
                        });
                    });
                });
            });
        });
    }

    private createAndOpenConfigFileIfNotExists(settings: UpsConfig = new UpsConfig()) {
        let contents = JSON.stringify(settings);

        fs.access(configFilePath, fs.constants.F_OK, err => {
            if (!err) {
                vscode.window.showInformationMessage('upsource.json already exists.');
                this.showFileInTextEditor(configFilePath);
                return;
            }

            fs.writeFile(configFilePath, contents, { encoding: 'utf8' }, err => {
                this.showFileInTextEditor(configFilePath);
                vscode.window.showInformationMessage(
                    'upsource.json has been created successfully.'
                );
            });
        });
    }

    private showFileInTextEditor(filePath): Promise<vscode.TextDocument> {
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
}
