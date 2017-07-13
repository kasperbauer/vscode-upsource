import * as vscode from 'vscode';

import { ReviewDescriptorDTO } from './ReviewDescriptorDTO';

export class ReviewTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly review?: ReviewDescriptorDTO
    ) {
        super(label, collapsibleState);
        
        this.command = {
            command: 'upsource.openReviewInBrowser',
            title: '',
            arguments: [ this.review ]
        };
    }
}
