import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ShareView } from './share-view';

const routes: Routes = [{ path: ':token', component: ShareView }];
@NgModule({ declarations: [ShareView], imports: [CommonModule, RouterModule.forChild(routes)] })
export class ShareModule {}
