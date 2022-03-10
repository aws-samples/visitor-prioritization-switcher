#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WaitingroomStack } from '../lib/waitingroom-stack';

const app = new cdk.App();
new WaitingroomStack(app, 'WaitingroomStack', {
  env: {
    region: 'us-east-1',
  },
});
