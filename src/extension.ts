'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as request from 'request';
import * as opn from 'opn';

import { UpsConfig } from './models/UpsConfig';
import { ReviewListDTO } from './models/ReviewListDTO';

const rootPath = vscode.workspace.rootPath;
const configFilePath = rootPath + '/upsource.json';
const defaultSettings = `{
    "url": "",
    "login": "",
    "password": "",
    "projectId": ""
}`;

export function activate(context: vscode.ExtensionContext) {
    checkForOpenReviews();

    // create upsource.json config file with defaults
    let setup = vscode.commands.registerCommand('upsource.setup', () => {
        createAndOpenConfigFileIfNotExists();
    });

    // get open reviews and show a quick pick list
    let openReviews = vscode.commands.registerCommand('upsource.openReviews', () => {
        showReviewQuickPicks('open');
    });

    // get all reviews and show a quick pick list
    let allReviews = vscode.commands.registerCommand('upsource.allReviews', () => {
        showReviewQuickPicks();
    });

    context.subscriptions.push(setup);
    context.subscriptions.push(openReviews);
    context.subscriptions.push(allReviews);
}

function checkForOpenReviews() {
    getReviewListWithState('open').then(
        res => {
            if (res.totalCount) {
                vscode.window.showInformationMessage(
                    'There are open Upsource reviews for this project.'
                );
            }
        },
        err => {
            console.log(err);
        }
    );
}

function createAndOpenConfigFileIfNotExists() {
    fs.access(configFilePath, fs.constants.F_OK, err => {
        if (!err) {
            vscode.window.showInformationMessage('upsource.json already exists.');
            showFileInTextEditor(configFilePath);
            return;
        }

        fs.writeFile(configFilePath, defaultSettings, 'utf8', err => {
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

function showReviewQuickPicks(state?: string) {
    getReviewListWithState(state).then(res => {
        let totalCount = res.totalCount,
            reviews = res.reviews;

        if (!totalCount) vscode.window.showInformationMessage('No ' + state + ' reviews.');
        else {
            let items = reviews.map(review => {
                let label = review.reviewId.reviewId;
                if (review.isUnread) label += ' *';

                let description = review.title;

                let detail = review.state == 1 ? '️⚠️ open' : '✅ closed';
                detail += ', ' + review.participants.length + ' participants';
                detail += ', ' + review.discussionCounter.counter + ' discussions';

                return { label, description, detail, review };
            });

            vscode.window.showQuickPick(items).then(selectedItem => {
                if (!selectedItem) return;

                getConfig().then(config => {
                    let url =
                        config.url +
                        '/' +
                        config.projectId +
                        '/review/' +
                        selectedItem.review.reviewId.reviewId;
                    opn(url);
                });
            });
        }
    });
}

function getReviewListWithState(state: string): Promise<ReviewListDTO> {
    let params = {
        limit: 99,
        query: state ? 'state: ' + state : ''
    };

    return sendAPIRequest('getReviews', 'POST', params);
}

function sendAPIRequest(path: string, method: string, params: Object = {}): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        let statusBarMessage = vscode.window.setStatusBarMessage(
            'Contacting Upsource API...',
            3000
        );

        getConfig().then(
            (config: UpsConfig) => {
                let body = { projectId: config.projectId };

                request(
                    {
                        baseUrl: config.url + '/~rpc',
                        uri: '/' + path,
                        method: method.toUpperCase(),
                        headers: {
                            Authorization:
                                'Basic ' +
                                    new Buffer(config.login + ':' + config.password).toString(
                                        'base64'
                                    )
                        },
                        json: true,
                        body: Object.assign(body, params)
                    },
                    (err, response, body) => {
                        if (err || (response.statusCode != 200 && response.statusCode != 201)) {
                            vscode.window.showInformationMessage(
                                'Upsource server is not reachable or responded with an error. Please check your upsource.json.'
                            );
                            reject(err);
                            return;
                        }

                        statusBarMessage.dispose();
                        resolve(body.result);
                    }
                );
            },
            err => {
                statusBarMessage.dispose();
                reject(err);
            }
        );
    });
}

function getConfig(): Promise<UpsConfig> {
    return new Promise<UpsConfig>((resolve, reject) => {
        fs.access(configFilePath, fs.constants.R_OK, err => {
            if (err) {
                vscode.window.showInformationMessage('upsource.json is not readable.');
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

export function deactivate() {}
