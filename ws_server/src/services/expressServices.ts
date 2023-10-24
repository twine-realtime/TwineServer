import { Request, Response } from "express";
import { io } from '../index';
const { connect } = require("mongoose");
const MgRequest = require('../db/mongoService');
import dynamoService from "../db/dynamoService";
import { Date } from 'mongoose';

// code from Mongoose Typescript Support
run().catch(err => console.log(err));

// Connect to MongoDB
async function run() {
  await connect(process.env.ENV_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

export const homeRoute = (req: Request, res: Response) => {
  console.log("you've got mail!");
  res.send('Nice work')
}

export const mongoPostmanRoute = async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  const data: string = req.body;
  console.log(data)

  const currentRequest = new MgRequest({
    room: {
      roomName: "room 1",
      roomData: data
    },
  });

  const savedRequest = await currentRequest.save();

  const timestamp: Date = savedRequest.createdAt
  let messageData: any[] = [data, timestamp]

  io.to("room 1").emit("message", messageData);

  console.log('SENT POSTMAN MESSAGE');

  res.send('ok');
}

export const mongoPostmanRoomsRoute = async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  interface jsonData {
    room: string;
    message: string;
  }
  
  const data: jsonData = req.body

  console.log('ROOM AND MESSAGE:', data.room, data.message);
  
  const currentRequest = new MgRequest({
    room: {
      roomName: data.room,
      roomData: data.message
    },
  });

  const savedRequest = await currentRequest.save();

  const timestamp: Date = savedRequest.createdAt
  let messageData: any[] = [data, timestamp]

  // only people in this room should receive this message event
  io.to(`${data.room}`).emit("roomJoined", messageData);

  console.log('SENT POSTMAN MESSAGE');

  res.send('ok');
}

type DynamoResponse = {
  $metadata: {
    httpStatusCode: number,
    requestId: string,
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: number,
    totalRetryDelay: number
  }
}

export const dynamoPostmanRoute = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const dynamoResponse = await dynamoService.createMessage(data.room_id, data.payload) as DynamoResponse;
    let messageData: any[] = [data.payload, data.time_created];

    console.log('SENT POSTMAN MESSAGE:', data.payload);
    io.to("room 1").emit("message", messageData);
    
    res.status(dynamoResponse['$metadata']['httpStatusCode']).send('ok');
  } catch (error) {
    console.log(error);
  }
}
