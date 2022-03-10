import { StackProps, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Statistic } from 'aws-cdk-lib/aws-cloudwatch';

export interface MonitorProps extends StackProps {
  distribution: Distribution;
  cff: cloudfront.Function;
}

export class Monitor extends Construct {

  constructor(scope: Construct, id: string, props: MonitorProps) {
    super(scope, id);
    const alarmName = 'AccessCountAlarm';
    const switcher = new PythonFunction(this, 'FunctionSwitcher', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler',
      entry: 'lambda/switcher',
      index: 'index.py',
      memorySize: 256,
      timeout: Duration.seconds(300),
      environment: {
        CFFNAME: props.cff.functionName,
        CFFPATH: 'visitorprioritization.js',
        HITRATE_LIMITED: '0.3',
        DISTRIBUTION: props.distribution.distributionId,
        ALARM_NAME: alarmName,
      },
    });
    
    const snsTopic = new sns.Topic(this, 'SNSTopic', {});
    switcher.addEventSource(new SnsEventSource(snsTopic, {}));
    switcher.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudfront:DescribeFunction'],
      resources: ['arn:aws:cloudfront::' + Stack.of(this).account + ':function/*'],
    }));
    switcher.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudfront:UpdateFunction', 'cloudfront:PublishFunction'],
      resources: [props.cff.functionArn],
    }));
    new cw.CfnAlarm(this, 'AccessCountAlarm', {
      comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      threshold: 3,
      alarmName: alarmName,
      namespace: 'AWS/CloudFront',
      metricName: 'Requests',
      dimensions: [{
        name: 'DistributionId',
        value: props.distribution.distributionId,
      }, {
        name: 'Region',
        value: 'Global',
      }],
      statistic: Statistic.SUM,
      period: 60,
      alarmActions: [snsTopic.topicArn],
      okActions:[snsTopic.topicArn],
      insufficientDataActions:[snsTopic.topicArn],
    });
  }
}
