import mongoose, { Schema, Document } from "mongoose";

export interface INews extends Document {
    title: string;
    content: string;
    source?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}
const NewsSchema = new Schema(
{
    title:{
        type:String,
        required:true,
        trim:true
    },

    content:{
        type:String,
        required:true
    },

    source:{
        type:String,
        default:"User"
    },
    tags:{
        type:[String],
        default:[]
    }
},
{
    timestamps:true
});
export const News = mongoose.model<INews>("News", NewsSchema);