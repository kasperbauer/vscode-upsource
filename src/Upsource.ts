import * as vscode from 'vscode';
import * as request from 'request';

import Config from './Config';
import { ReviewListDTO } from './models/ReviewListDTO';
import { UpsConfig } from './models/UpsConfig';

function sendAPIRequest(path: string, method: string, params: Object = {}): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        let statusBarMessage = vscode.window.setStatusBarMessage(
            'Contacting Upsource API...',
            3000
        );

        Config.get().then(
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
                            console.log(err, response);
                            
                            vscode.window.showErrorMessage(
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

function getReviewListWithState(state: string): Promise<ReviewListDTO> {
    let params = {
        limit: 99,
        query: state ? 'state: ' + state : ''
    };

    return sendAPIRequest('getReviews', 'POST', params);
}

export default {
    sendAPIRequest,
    getReviewListWithState
};