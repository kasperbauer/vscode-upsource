import * as vscode from 'vscode';
import * as path from 'path';

import { ReviewDescriptorDTO } from './ReviewDescriptorDTO';

export class ReviewTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly review?: ReviewDescriptorDTO
    ) {
        super(label, collapsibleState);
        if (review) {
            this.command = {
                command: 'upsource.openReviewInBrowser',
                title: '',
                arguments: [ this.review ]
            };

            this.iconPath = {
                light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'document.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'document.svg')
            };
            
            this.contextValue = 'review';
        }

    }
}
