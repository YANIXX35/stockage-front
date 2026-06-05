import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Landing } from './landing';

const routes: Routes = [{ path: '', component: Landing }];
@NgModule({ declarations: [Landing], imports: [CommonModule, RouterModule.forChild(routes)] })
export class LandingModule {}
