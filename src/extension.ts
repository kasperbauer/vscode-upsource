'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as request from 'request';
import * as _ from 'lodash';

import { UpsConfig } from './models/UpsConfig';
import { ReviewListDTO } from './models/ReviewListDTO';

export function activate(context: vscode.ExtensionContext) {
    checkForOpenReviews();

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
    getReviewListWithState('open').then(res => {
        if (res.totalCount) {
            vscode.window.showInformationMessage(
                'There are Upsource Reviews for this project available.'
            );
        }
    });
}

function showReviewQuickPicks(state?: string) {
    getReviewListWithState(state).then(res => {
        let totalCount = res.totalCount,
            reviews = res.reviews;

        console.log(res);

        if (!totalCount) vscode.window.showInformationMessage('No ' + state + ' reviews.');
        else {
            let items = reviews.map(review => {
                let label = review.reviewId.reviewId;
                if (review.isUnread) label += ' *';

                let description = review.title;

                let detail = review.state == 1 ? '️⚠️  open' : '✅  closed';
                detail += ', ' + review.participants.length + ' participants';
                detail += ', ' + review.discussionCounter.counter + ' discussions';

                return { label, description, detail };
            });
            vscode.window.showQuickPick(items);
        }
    });
}

function getReviewListWithState(state: string) {
    return new Promise<ReviewListDTO>((resolve, reject) => {
        let statusBarMessage = vscode.window.setStatusBarMessage('Fetching Reviews');

        getConfig().then(
            (config: UpsConfig) => {
                request(
                    {
                        baseUrl: config.url + '/~rpc',
                        uri: '/getReviews',
                        method: 'POST',
                        headers: {
                            Authorization:
                                'Basic ' +
                                    new Buffer(config.login + ':' + config.password).toString(
                                        'base64'
                                    )
                        },
                        json: true,
                        body: {
                            projectId: config.projectId,
                            limit: 99,
                            query: state ? 'state: ' + state : ''
                        }
                    },
                    (err, response, body) => {
                        if (response.statusCode != 200) {
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
