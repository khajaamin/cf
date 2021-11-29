const sharp = require('sharp')
const AWS = require('aws-sdk')
const SvgFill = require('svg-fill');

const s3 = new AWS.S3()
const svgFill = new SvgFill('#FF0000');

const supportedWidths = new Set(['1920', '1280', '1080', '720', '480', '320', '120', '50'])

exports.handler = async (event) => {
 // console.log('request: ' + JSON.stringify(event))
  // if (event.headers['User-Agent'] !== 'Amazon CloudFront') {
  //   return {
  //     statusCode: 403,
  //     body: 'Not authorized'+JSON.stringify(event)
  //   }
  // }
  try{
    const { image, width } = event.pathParameters

    // redirect to default supported width when requested with is not supported
    if (width !='original' && !supportedWidths.has(width)) {
      return {
          statusCode: 403,
          body: 'Not authorized'
      }
    }


    const file = await s3
      .getObject({
        Bucket: process.env.PRIVATE_BUCKET_NAME,
        Key: image
      })
      .promise()

      //for file which needs to change color based on params
      if(color){
        const coloredSvgData = svgFill.fillSvg(file.Body);
        return {
          statusCode: 200,
          body:coloredSvgData.toString('base64'),
          isBase64Encoded: true,
          headers: {
            'Content-Type': file.ContentType,
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
          }
        }

      }

      // for original file 

      if(width == 'original'){
        return {
          statusCode: 200,
          body: file.Body.toString('base64'),
          isBase64Encoded: true,
          headers: {
            'Content-Type': file.ContentType,
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
          }
        }
      }
    

    const { data, info } = await sharp(file.Body)
      .resize({ width: parseInt(width) })
      .toBuffer({ resolveWithObject: true })

    await s3
    .putObject({
      Bucket: process.env.CDN_BUCKET_NAME,
      Key: `image/${width}/${image}`,
      Body: data,
      ContentType: 'image/' + info.format,
      Metadata: {
        original_key: image
      }
    })
    .promise()

    return {
      statusCode: 200,
      body: data.toString('base64'),
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'image/' + info.format,
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      }
    }
  }catch (e){
    return {
      statusCode: 400,
      body: JSON.stringify(e)
    }
  }
}