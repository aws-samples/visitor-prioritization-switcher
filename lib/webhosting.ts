import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as fs from 'fs';
import * as path from 'path';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';


export class WebHosting extends Construct {
  readonly distribution: Distribution;
  readonly cff: cloudfront.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const websiteBucket = new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const websiteIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'WebsiteIdentity'
    );
    websiteBucket.grantRead(websiteIdentity);

    this.cff = new cloudfront.Function(this, 'CFF', {
      functionName: 'SwitchableFunction',
      code: cloudfront.FunctionCode.fromInline(fs.readFileSync(`${path.resolve(__dirname)}/../lambda/switcher/visitorprioritization.js`, 'utf8')),
    });
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {originAccessIdentity:  websiteIdentity}),
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: this.cff,
          },
        ],
      },
    });

    new s3deploy.BucketDeployment(this, 'WebsiteDeploy', {
      sources: [s3deploy.Source.asset(`${path.resolve(__dirname)}/../public/`)],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      memoryLimit: 1024,
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: `https://${this.distribution.domainName}`,
    });
  }

}
