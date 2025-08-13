import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = file.originalname.split(".").pop();
        cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
    }
});

export const upload = multer({
    storage,
    fileFilter: function(req, file, cb) {
        if (file.fieldname === "image") { // only accept files with fieldname "image"
            cb(null, true);
        } else {
            cb(new Error("Unexpected field"));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // limit file size to 5MB
    }
});