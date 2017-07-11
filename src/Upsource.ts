import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
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
                        if (typeof body.error != 'undefined') err = body.error;

                        if (err) {
                            console.log('ERROR', err);
                            
                            if (err) {
                                vscode.window.showErrorMessage(err.message + ' (' + err.code + ')');
                            }

                            reject(err);
                            return;
                        }

                        statusBarMessage.dispose();
                        resolve(body);
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

function getReviewList(query?: string): Promise<ReviewListDTO> {
    return new Promise<ReviewListDTO>((resolve, reject) => {    
        let params = {
            limit: 99,
            query: query || ''
        };

        sendAPIRequest('getReviews', 'POST', params).then((res) =>{
            resolve(res.result)
        }, (err) => {
            reject(err);
        }); ;
    });
}

function createReview(
    branch: string = null,
    revisions: string[] = null
): Promise<ReviewDescriptorDTO> {
    return new Promise<ReviewDescriptorDTO>((resolve, reject) => {
        if (!branch && !revisions) {
            reject();
            return;
        }

        let params = {};
        if (branch) params = Object.assign(params, { branch });
        if (revisions) params = Object.assign(params, { revisions });

        sendAPIRequest('createReview', 'POST', params).then(
            res => {
                resolve(res.result);
            },
            err => {
                console.log('ERROR', err);
                reject(err);
            }
        );
    });
}

function getBranches(): Promise<BranchListDTO> {
    let params = {
        limit: 99,
        query: ''
    };

    return new Promise<BranchListDTO>((resolve, reject) => {    
        sendAPIRequest('getBranches', 'POST', params).then((res) =>{
            resolve(res.result)
        }, (err) => {
            reject(err);
        }); ;
    });
}

export default {
    getReviewList,
    getBranches,
    createReview
};
