const
    nodePort = 8080,
    express = require( 'express' ),
    app = express(),
    http = require( 'http' ),
    server = http.createServer( app ),
    os = require('os'),
    fs = require('fs'),
    path = require('path')
    ;

app.get( '/', ( req, res ) => {
    const AWS = require('aws-sdk');

    AWS.config.update({ region: 'us-east-1' }); // your region

    const s3 = new AWS.S3({
    accessKeyId: '', // your key
    secretAccessKey: '' // your key
    });

    const bucketName = 'hcp-d70ddcb4-a5da-4840-a686-42dbbd25637d'; // your bucket

    listBucketContents({s3: s3, bucketName: bucketName});

    (async () => {
        const fileName = 'upload_1.txt';
        await checkAndCreateDirectory({s3: s3, bucketName: bucketName, directoryName: 'temp-dataset'});
        let localFilePath = path.join(__dirname, '.tmp', fileName);
        await uploadFile({s3: s3, bucketName: bucketName, directoryName: 'temp-dataset', localFilePath: localFilePath });
        localFilePath = path.join(__dirname, '.tmp', 'downloaded_1.txt');
        await downloadFile({s3: s3, bucketName: bucketName, directoryName: 'temp-dataset', fileName: fileName, localFilePath: localFilePath });
      })();

    res.send(`Hello from ${os.hostname()} to amazon s3!`)
});

server.listen( nodePort );

console.log( `Express server listening on port ${server.address().port} in ${app.settings.env} mode` );

//------------------------------------------------------------------------------------------------------
// Функция для получения содержимого бакета S3
function listBucketContents({s3, bucketName}) {
    const params = {
      Bucket: bucketName
    };
  
    s3.listObjectsV2(params, (err, data) => {
      if (err) {
        console.log('Error', err);
      } else {
        console.log('Success', data);
        data.Contents.forEach((item) => {
          console.log(item.Key);
        });
      }
    });
}

// Функция для проверки существования директории на S3 и её создания при отсутствии в указанном бакете 
async function checkAndCreateDirectory({s3, bucketName, directoryName}) {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: `${directoryName}/`
      };
  
      const data = await s3.listObjectsV2(params).promise();
  
      if (data.Contents.length === 0) {
        console.log(`Directory ${directoryName} does not exist. Creating...`);
        const params = {
          Bucket: bucketName,
          Key: `${directoryName}/`
        };
        await s3.putObject(params).promise();
        console.log(`Directory ${directoryName} created.`);
      } else {
        console.log(`Directory ${directoryName} already exists.`);
      }
    } catch (error) {
      console.error('Error checking or creating directory:', error);
    }
  }

// Функция для загрузки файла на S3 (если он уже существует то перезапишется)
async function uploadFile({s3, bucketName, directoryName, localFilePath}) {
    try {
      if (fs.existsSync(localFilePath)) {
        const fileContent = fs.readFileSync(localFilePath);
  
        const params = {
          Bucket: bucketName,
          Key: `${directoryName}/upload_1.txt`,
          Body: fileContent
        };
  
        await s3.upload(params).promise();
        console.log('File uploaded successfully.');
      } else {
        console.log('File upload_1.txt does not exist in the .tmp directory.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  //Функция скачивания файла с s3
  async function downloadFile({ s3, bucketName, directoryName, fileName, localFilePath }) {
    try {
      const params = {
        Bucket: bucketName,
        Key: `${directoryName}/${fileName}`
      };
  
      const data = await s3.getObject(params).promise();
      fs.writeFileSync(localFilePath, data.Body);
      console.log('File downloaded successfully.');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }