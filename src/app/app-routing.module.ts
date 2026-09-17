import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PosComponent } from './features/pos/pos.component';

const routes: Routes = [
  {
    path: '',
    component: PosComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
