import * as vscode from 'vscode';

import Upsource from './Upsource';
import { ReviewDescriptorDTO } from './models/ReviewDescriptorDTO';
import { ReviewListDTO } from './models/ReviewListDTO';
import { ReviewTreeItem } from './models/ReviewTreeItem';

export default class ReviewsProvider implements vscode.TreeDataProvider<ReviewTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReviewTreeItem | null> = new vscode.EventEmitter<ReviewTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<ReviewTreeItem | null> = this
        ._onDidChangeTreeData.event;

    constructor() {}

    getChildren(element?: ReviewTreeItem): Thenable<ReviewTreeItem[]> {
        return new Promise<any>((resolve, reject) => {
            Upsource.getReviewList('state: open').then(
                res => {
                    let items = res.reviews.map(review => {
                        return new ReviewTreeItem(review.title, vscode.TreeItemCollapsibleState.None, review);
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

	getTreeItem(element: ReviewTreeItem): vscode.TreeItem {
		return element;
	}
}