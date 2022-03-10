import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Monitor } from './monitor';

import { WebHosting } from './webhosting';

export class WaitingroomStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const webHosting = new WebHosting(this, 'WebHosting');
    new Monitor(this, 'Monitor', {
      distribution: webHosting.distribution,
      cff: webHosting.cff,
    })
  }
}
