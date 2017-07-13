import * as vscode from 'vscode';

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
            if (element) {
                reject();
                return;
            }

            Upsource.getReviewList().then(
                res => {
                    if (!res.totalCount) {
                        resolve([
                            new ReviewTreeItem(
                                'No reviews.',
                                vscode.TreeItemCollapsibleState.None
                            )
                        ]);
                        return;
                    }

                    let items = res.reviews.sort((a, b) => {
                        return a.state - b.state;
                    }).map(review => {
                        let title = review.reviewId.reviewId + ` (${review.title})`;
                        if (review.state == ReviewStateEnum.Closed) title += ' 🔒';
                        else if (review.isReadyToClose) title += ' ✅';
                        else if (review.discussionCounter.hasUnresolved) title += ' 💬';

                        return new ReviewTreeItem(
                            title,
                            vscode.TreeItemCollapsibleState.None,
                            review
                        );
                    });
                    resolve(items);
                },
                err => {
                    console.error(err);
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
