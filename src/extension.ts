'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as request from 'request';
import * as _ from 'lodash';

import { UpsConfig } from './models/UpsConfig';

export function activate(context: vscode.ExtensionContext) {
    // checkForOpenReviews();

    // create upsource.json config file with defaults
    let setup = vscode.commands.registerCommand('upsource.setup', () => {
        let defaultSettings = {
            url: '',
            login: '',
            password: ''
        };

        let rootPath = vscode.workspace.rootPath,
            filePath = rootPath + '/upsource.json';

        fs.access(filePath, fs.constants.F_OK, err => {
            if (!err) {
                vscode.window.showInformationMessage('upsource.json already exists.');
                showFileInTextEditor(filePath);
                return;
            }

            fs.writeFile(filePath, JSON.stringify(defaultSettings), 'utf8', err => {
                showFileInTextEditor(filePath);
                vscode.window.showInformationMessage(
                    'upsource.json has been created successfully.'
                );
            });
        });
    });

    let getReviews = vscode.commands.registerCommand('upsource.getReviews', () => {
        getConfig().then((config: UpsConfig) => {
            request({
                baseUrl: config.url + '/~rpc',
                uri: '/getReviews',
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + new Buffer(config.login + ':' + config.password).toString('base64'),
                },
                json: true,
                body: {
                    projectId: config.projectId,
                    limit: 99
                }
            }, (err, response, body) => {
                if (err) {
                    vscode.window.showInformationMessage(
                        'Upsource server is not reachable or responded with an error.'
                    );
                    return;
                }

                let result = body.result,
                    totalCount = result.totalCount,
                    reviews = result.reviews;
                    
                console.log(reviews);
                
                if (!totalCount) vscode.window.showInformationMessage('No open Reviews.');
                else {
                    let items = reviews.map((review) => {
                        return {
                            label: review.reviewId.reviewId,
                            detail: review.title,
                            description: 'open'
                        }
                    });
                    vscode.window.showQuickPick(items);
                }
            }); 
        });
    });

    context.subscriptions.push(setup);
    context.subscriptions.push(getReviews);
}

function checkForOpenReviews() {
    let thenable: Thenable<string | undefined> = vscode.window.showInformationMessage(
        'There are open reviews for this project.'
    );
}

function showFileInTextEditor(filePath) {
    vscode.workspace.openTextDocument(filePath).then((textDocument: vscode.TextDocument) => {
        vscode.window.showTextDocument(textDocument);
    });
}

function getConfig(): Promise<UpsConfig> {
    let rootPath = vscode.workspace.rootPath,
        filePath = rootPath + '/upsource.json';

    return new Promise<UpsConfig>((resolve, reject) => {
        fs.access(filePath, fs.constants.R_OK, err => {
            if (err) {
                vscode.window.showInformationMessage('upsource.json is not readable.');
                reject(err);
                return;
            }

            fs.readFile(filePath, 'utf8', function(err, data) {
                if (err) reject(err);
                else resolve(<UpsConfig>JSON.parse(data));
            });
        });
    });
}

export function deactivate() {}
