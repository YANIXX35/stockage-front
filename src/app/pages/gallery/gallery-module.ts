import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Gallery } from './gallery';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Gallery }];
@NgModule({ declarations: [Gallery], imports: [CommonModule, SharedModule, RouterModule.forChild(routes)] })
export class GalleryModule {}
