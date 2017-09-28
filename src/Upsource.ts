import * as vscode from 'vscode';
import * as request from 'request';

import ConfigService from './Config';
import { ParticipantInReviewDTO } from './models/ParticipantInReviewDTO';
import { ParticipantStateEnum } from './models/Enums';
import { BranchListDTO } from './models/BranchListDTO';
import { FullUserInfoDTO } from './models/FullUserInfoDTO';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewIdDTO } from './models/ReviewIdDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { RevisionDescriptorListDTO } from './models/RevisionDescriptorListDTO';
import { UpsConfig } from './models/UpsConfig';

const Config = new ConfigService;

export default class Upsource {
    users: FullUserInfoDTO[] = [];

    getReviewList(query?: string): Promise<ReviewListDTO> {
        return new Promise<ReviewListDTO>((resolve, reject) => {
            let params = {
                limit: 99,
                query: query || ''
            };

            this.sendAPIRequest('getReviews', 'POST', params).then(
                res => resolve(res.result),
                err => reject(err)
            );
        });
    }

    createReview(branch: string = null, revisions: string[] = null): Promise<ReviewDescriptorDTO> {
        return new Promise<ReviewDescriptorDTO>((resolve, reject) => {
            if (!branch && !revisions) {
                reject();
                return;
            }

            let params = {};
            if (branch) params = Object.assign(params, { branch });
            if (revisions) params = Object.assign(params, { revisions });

            this.sendAPIRequest('createReview', 'POST', params).then(
                res => resolve(res.result),
                err => reject(err)
            );
        });
    }

    getBranches(): Promise<BranchListDTO> {
        let params = {
            limit: 99,
            query: ''
        };

        return new Promise<BranchListDTO>((resolve, reject) => {
            this.sendAPIRequest('getBranches', 'POST', params).then(
                res => resolve(res.result),
                err => reject(err)
            );
        });
    }

    closeReview(reviewId: ReviewIdDTO): Promise<any> {
        let params = {
            reviewId,
            isFlagged: true
        };

        return new Promise<any>((resolve, reject) => {
            this.sendAPIRequest('closeReview', 'POST', params).then(
                res => resolve(res.result),
                err => reject(err)
            );
        });
    }

    getUsers(pattern: string = ''): Promise<FullUserInfoDTO[]> {
        let params = {
            pattern: pattern || '',
            limit: 99
        };

        return new Promise<FullUserInfoDTO[]>((resolve, reject) => {
            this.sendAPIRequest('findUsers', 'POST', params).then(
                res => {
                    let users = res.result.infos;
                    this.users = users;
                    resolve(users);
                },
                err => reject(err)
            );
        });
    }

    getRevisions(): Promise<RevisionDescriptorListDTO> {
        let params = {
            limit: 99
        };

        return new Promise<RevisionDescriptorListDTO>((resolve, reject) => {
            this.sendAPIRequest('getRevisionsList', 'POST', params).then(
                res => resolve(res.result),
                err => reject(err)
            );
        });
    }

    hasRaisedConcerns(review: ReviewDescriptorDTO): boolean {
        return !!review.participants.filter(
            participant => participant.state == ParticipantStateEnum.Rejected
        ).length;
    }

    findUser(userId: string): FullUserInfoDTO {
        return this.users.find(user => user.userId == userId) || null;
    }
        
    removeParticipantFromReview(reviewId: ReviewIdDTO, participant: ParticipantInReviewDTO): Promise<any> {
        let params = {
            reviewId,
            participant
        };

        return new Promise<any>((resolve, reject) => {
            this.sendAPIRequest('removeParticipantFromReview', 'POST', params).then(
                res => resolve(),
                err => reject(err)
            );
        });
    }

    private sendAPIRequest(path: string, method: string, params: Object = {}): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            Config.get().then(
                (config: UpsConfig) => {
                    let body = Object.assign({ projectId: config.projectId }, params),
                        timeout = 10000,
                        statusBarMessage = vscode.window.setStatusBarMessage(
                            'Contacting Upsource API...',
                            timeout
                        );

                    console.log(`SENDING REQUEST '${path}'`);
                    console.log(body);

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
                            body,
                            timeout
                        },
                        (err, response, body) => {
                            if (typeof body != 'undefined' && typeof body.error != 'undefined') {
                                err = body.error.message;
                            }

                            console.log(`RESPONSE '${path}'`);
                            console.log(err || body);

                            statusBarMessage.dispose();

                            if (err) {
                                reject(err);
                                return;
                            }

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
}
