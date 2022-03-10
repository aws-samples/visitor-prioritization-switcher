import os
import json
import boto3
import re
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.data_classes import SNSEvent

CFFNAME = os.environ.get('CFFNAME')
DISTRIBUTION = os.environ.get('DISTRIBUTION')
ALARM_NAME = os.environ.get('ALARM_NAME')
CFFPATH = os.environ.get('CFFPATH')
HITRATE_LIMITED = os.environ.get('HITRATE_LIMITED')

logger = Logger(service='switcher')
cfClient = boto3.client('cloudfront')


@logger.inject_lambda_context(log_event=True)
def handler(ev, context):
    event = SNSEvent(ev)
    for record in event.records:
        message = json.loads(record.sns.message)
        if message['AlarmName'] == ALARM_NAME:
            cff = cfClient.describe_function(
                Name=CFFNAME,
            )
            if message['NewStateValue'] == 'ALARM':
                hitrate = HITRATE_LIMITED
            else:
                hitrate = '1.0'
            with open(CFFPATH, 'r') as f:
                script = re.sub(r'var +originHitRate *= *[\d\.]+;?', f'var originHitRate = {hitrate};', f.read())
                fnc = cfClient.update_function(
                    Name=CFFNAME,
                    IfMatch=cff['ETag'],
                    FunctionConfig={'Comment': CFFNAME, 'Runtime': 'cloudfront-js-1.0'},
                    FunctionCode=script.encode('utf-8')
                )
                res = cfClient.publish_function(
                    Name=CFFNAME,
                    IfMatch=fnc['ETag']
                )
                logger.info(res)
