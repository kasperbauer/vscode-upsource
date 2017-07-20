import * as vscode from 'vscode';

import Config from './Config';
import Upsource from './Upsource';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { ReviewStateEnum } from './models/Enums';
import { ReviewTreeItem } from './models/ReviewTreeItem';

export default class ReviewsDataProvider implements vscode.TreeDataProvider<ReviewTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReviewTreeItem | null> = new vscode.EventEmitter<ReviewTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<ReviewTreeItem | null> = this._onDidChangeTreeData
        .event;

    getChildren(element?: ReviewTreeItem): Promise<ReviewTreeItem[]> {
        return new Promise((resolve, reject) => {
            if (!Config.fileExists()) {
                let statusBarMessage = vscode.window.setStatusBarMessage(
                    'upsource.json does not exist.',
                    3000
                );

                reject();
                return;
            }
            
            let state = element ? 'closed' : 'open';

            Upsource.getReviewList(`state: ${state}`).then(
                res => {
                    let items: ReviewTreeItem[] = [];

                    if (res.totalCount) {
                        items = res.reviews.map(review => {
                            let title = review.reviewId.reviewId + ` (${review.title})`;
                            // if (review.state == ReviewStateEnum.Closed) title = '🔒 ' + title;
                            // if (review.isReadyToClose) title += ' ✅';
                            if (review.discussionCounter.hasUnresolved) title += ' 💬';

                            return new ReviewTreeItem(
                                title,
                                vscode.TreeItemCollapsibleState.None,
                                'review',
                                review
                            );
                        });
                    } else {
                        items = [
                            new ReviewTreeItem(`No ${state} reviews.`, vscode.TreeItemCollapsibleState.None)
                        ];
                    }

                    if (!element) {
                        items = items.concat([
                            new ReviewTreeItem(
                                'Closed Reviews',
                                vscode.TreeItemCollapsibleState.Collapsed,
                                'folder'
                            )
                        ]);
                    }

                    resolve(items);
                },
                err => {
                    reject(err);
                }
            );
        });
    }

    getTreeItem(element: ReviewTreeItem): ReviewTreeItem | Promise<ReviewTreeItem> {
        return element;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
