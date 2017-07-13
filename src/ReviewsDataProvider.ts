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
            if (!Config.fileExists()) reject();

            let query = element ? 'state: closed' : 'state: open';
            
            Upsource.getReviewList(query).then(
                res => {
                    if (!res.totalCount) {
                        resolve([
                            new ReviewTreeItem('No reviews.', vscode.TreeItemCollapsibleState.None)
                        ]);
                        return;
                    }

                    let items = res.reviews.map(review => {
                        let title = review.reviewId.reviewId + ` (${review.title})`;
                        // if (review.state == ReviewStateEnum.Closed) title = '🔒 ' + title;
                        if (review.isReadyToClose) title += ' ✅';
                        else if (review.discussionCounter.hasUnresolved) title += ' 💬';

                        return new ReviewTreeItem(
                            title,
                            vscode.TreeItemCollapsibleState.None,
                            'review',
                            review
                        );
                    });

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
                err => reject(err)
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
