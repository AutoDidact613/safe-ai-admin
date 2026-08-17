const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  hours: { type: Number, required: true, min: 0 },
  order: { type: Number, default: 0 },
});

const CourseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    units: [UnitSchema],
  },
  { timestamps: true }
);

CourseSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Course", CourseSchema);
