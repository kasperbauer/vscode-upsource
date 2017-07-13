import { FullUserInfoDTO } from './models/FullUserInfoDTO';
import * as vscode from 'vscode';
import * as request from 'request';

import Config from './Config';
import { BranchListDTO } from './models/BranchListDTO';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewIdDTO } from './models/ReviewIdDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { RevisionDescriptorListDTO } from './models/RevisionDescriptorListDTO';
import { UpsConfig } from './models/UpsConfig';

function sendAPIRequest(path: string, method: string, params: Object = {}): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        Config.get().then(
            (config: UpsConfig) => {
                let body = Object.assign({ projectId: config.projectId }, params),
                    statusBarMessage = vscode.window.setStatusBarMessage(
                        'Contacting Upsource API...',
                        3000
                    );

                console.log('SENDING REQUEST');
                console.log(body);

                request(
                    {
                        baseUrl: config.url + '/~rpc',
                        uri: '/' + path,
                        method: method.toUpperCase(),
                        headers: {
                            Authorization:
                                'Basic ' +
                                new Buffer(config.login + ':' + config.password).toString('base64')
                        },
                        json: true,
                        body
                    },
                    (err, response, body) => {
                        if (typeof body != 'undefined' && typeof body.error != 'undefined') {
                            err = body.error;
                        }

                        if (err) {
                            console.log('ERROR', err);

                            if (err) {
                                vscode.window.showErrorMessage(err.message + ' (' + err.code + ')');
                            }

                            reject(err);
                            return;
                        }

                        console.log('RESPONSE');
                        console.log(body);

                        statusBarMessage.dispose();
                        resolve(body);
                    }
                );
            },
            err => {
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

        sendAPIRequest('getReviews', 'POST', params).then(
            res => resolve(res.result),
            err => reject(err)
        );
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
            res => resolve(res.result),
            err => reject(err)
        );
    });
}

function getBranches(): Promise<BranchListDTO> {
    let params = {
        limit: 99,
        query: ''
    };

    return new Promise<BranchListDTO>((resolve, reject) => {
        sendAPIRequest('getBranches', 'POST', params).then(
            res => resolve(res.result),
            err => reject(err)
        );
    });
}

function closeReview(reviewId: ReviewIdDTO): Promise<any> {
    let params = {
        reviewId,
        isFlagged: true
    };

    return new Promise<any>((resolve, reject) => {
        sendAPIRequest('closeReview', 'POST', params).then(
            res => resolve(res.result),
            err => reject(err)
        );
    });
}

function getUsers(pattern: string = ''): Promise<FullUserInfoDTO[]> {
    let params = {
        pattern: pattern || '',
        limit: 99
    };

    return new Promise<FullUserInfoDTO[]>((resolve, reject) => {
        sendAPIRequest('findUsers', 'POST', params).then(
            res => resolve(res.result.infos),
            err => reject(err)
        );
    });
}

export default {
    getReviewList,
    getBranches,
    getUsers,
    createReview,
    closeReview
};
