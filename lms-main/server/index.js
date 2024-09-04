require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const pool = require("./db");
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
// // const { PDFDocument } = require('pdf-lib');
// const fs = require('fs');
// const path = require('path');
// const { Console, error } = require('console');
const { format } = require('date-fns');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your_secret_key';
const jwtSecret = 'your_jwt_secret_key';
// const { PDFDocument, rgb, StandardFonts } = require('pdf-lib'); 
// const copyTo = require('pg-copy-streams').to;
// const archiver = require('archiver');

app.use(cors());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// const imagesDir = path.join(__dirname, 'images');
// if (!fs.existsSync(imagesDir)) {
//     fs.mkdirSync(imagesDir);
// }

// const imagesDir2 = path.join(__dirname, 'sign');
// if (!fs.existsSync(imagesDir)) {
//     fs.mkdirSync(imagesDir);
// }

// const pdfDir = path.join(__dirname, 'pdfs');
// if (!fs.existsSync(pdfDir)) {
//   fs.mkdirSync(pdfDir);
// }

app.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
  
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text
    };
  
    try {
      await transporter.sendMail(mailOptions);
      res.status(200).send('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending email: ' + error.message);
    }
  });

  app.post('/forgot-password', async (req, res) => {
    const { emailid } = req.body;

    try {
        const query = await pool.query('SELECT * FROM public."learners" WHERE emailid = $1', [emailid]);
        if (query.rows.length === 0) {
            return res.status(400).send('Error: Invalid credentials');
        }

        const email = query.rows[0].emailid;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome Learners NITTTR,Chennai',
            text: `Your OTP is: ${otp}`
        };
        console.log(otp)
        // localStorage.setItem('OTP',otp);
        await transporter.sendMail(mailOptions);
        const payload = {otp};
        const token = jwt.sign(payload, SECRET_KEY)
        res.status(200).json({ message: 'Email sent successfully',token});
        return otp;
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Error sending email: ' + error.message);
    }
});

app.post('/forgot-password1', async (req, res) => {
    const { email_id } = req.body;
    console.log(email_id)

    try {
        // try {
          const query = await pool.query('SELECT emailid FROM public."learners" WHERE emailid = $1', [email_id]);
          if(query.rowCount===1)
            throw error
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email_id,
            subject: 'NITTTR Admission',
            text: `Registartion Successful,
            Enter the otp for activation of your account 
            Your OTP is: ${otp}`
        };
        // localStorage.setItem('OTP',otp);
        console.log(otp);
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully', otp: otp });
        return otp;
    } catch (error) {
        console.log(error)
        res.send('Error sending email: ' + error.message);
    }
});

app.post('/reset-password', async(req, res) => {
    try {
        const {emailid, newPassword} = req.body
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword , salt);
        const mycomplaints = await pool.query('UPDATE public."learners" SET password=$1 WHERE emailid=$2',[hashedPassword,emailid]);
        res.status(200).send('Reset successfull')
    } catch (err) {
        console.error(err.message);
    }
})


app.post('/register', async (req, res) => {
    const { email_id, phone_number, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        // Insert into the learners table
        await pool.query('INSERT INTO public."learners" (emailid, mobileno, password) VALUES ($1, $2, $3)', [email_id, phone_number, hashedPassword]);
        
        // Insert into the learners_personal_info table and get the id
        const result = await pool.query('INSERT INTO public."learners_personal_info" (emailid) VALUES ($1) RETURNING id', [email_id]);
        const id = result.rows[0].id;

        // Generate the enrollment_id
        const currentDate = new Date();
        const year = currentDate.getFullYear().toString().slice(-2); // Last 2 digits of the current year
        const month = ('0' + (currentDate.getMonth() + 1)).slice(-2); // Current month (2 digits)
        const formattedId = ('000' + id).slice(-4); // Ensure id is 4 digits
        const enrollment_id = year + month + formattedId;
        console.log(enrollment_id);
        // Update the learners_personal_info table with the enrollment_id
        await pool.query('UPDATE public."learners_personal_info" SET enrollment_id=$1 WHERE id=$2 ', [enrollment_id, id]);
        await pool.query('INSERT INTO public."learners_documents" (enrollment_id) values ($1)',[enrollment_id])
        res.json({
            msg: 'Registration successful',
            enrollment_id: enrollment_id
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post(`/personal_info_save/:id`, async (req, res) => {
    const id=req.params.id;
    const {name,father_name,
        mother_name,person_with_disability,dob,selectedState,selectedCity,
        gender,Category,aadhar_number,designation,department,institutionName,
        currentExperience,totalExperience,principalName,instituteContact,nationality,country
    }=req.body;
    
    try {
        const result=await pool.query(
            `UPDATE public."learners_personal_info" 
             SET name=$1, father_name=$2, mother_name=$3, person_with_disability=$4, 
                  state=$5, city=$6, gender=$7, category=$8, aadhar_number=$9,dob=$10,
                  designation=$11,department=$12,institution_name=$13,
                current_experience=$14,total_experience=$15,principal_name=$16,institute_contact=$17,
                nationality=$18,country=$19
             WHERE enrollment_id=$20`, 
            [name, father_name, mother_name, person_with_disability, selectedState, 
                selectedCity, gender, Category, aadhar_number,dob,designation,department,institutionName,
                currentExperience,totalExperience,principalName,instituteContact,nationality,country,id
            ]
          );
        res.status(200).json({message:'Saved Successfully'});
    } 
    catch (error) {
        console.log(error.message);
    }
});

app.post(`/address_info_save/:id`, async (req, res) => {
    const id=req.params.id;
    const {combinedCorrespondenceAddress,combinedPermanentAddress}=req.body;
    
    try {
        const result=await pool.query(
            `UPDATE public."learners_personal_info" 
             SET permanent_address=$1,current_address=$2
             WHERE enrollment_id=$3`, 
            [ combinedPermanentAddress,combinedCorrespondenceAddress,id]
          );
        res.status(200).json({message:'Saved Successfully'});
    } 
    catch (error) {
        console.log(error.message);
    }
});

app.post(`/work_info_save/:id`, async (req, res) => {
    const id = req.params.id;
    const qualifications = req.body.qualifications;
  
    try {
    
      const insertPromises = qualifications.map((qualification) => {
        return pool.query(
          `INSERT INTO public.learners_work_info 
          (enrollment_id, organisation_name, organisation_address, organisation_designation, date_from, date_to, organisation_type) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            qualification.organisationName,
            qualification.organisationAddress,
            qualification.designation,
            qualification.fromDate,
            qualification.toDate,
            qualification.organisationType
          ]
        );
      });
  
      await Promise.all(insertPromises);
  
      res.status(200).json({ message: 'Saved Successfully' });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  app.post(`/academic_info_save/:id`, async (req, res) => {
    const id = req.params.id;
    const qualifications = req.body.qualifications;
  
    try {
      const insertPromises = qualifications.map((qualification) => {
        return pool.query(
          `INSERT INTO public.learners_academic_info 
          (enrollment_id, branch, school_clgname, board_university, year_of_passing, percentage, qualification_level) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            qualification.branch,
            qualification.school_clgname,
            qualification.board_university,
            qualification.year_of_passing,
            qualification.percentage,
            qualification.qualification_level
          ]
        );
      });
  
      await Promise.all(insertPromises);
  
      res.status(200).json({ message: 'Saved Successfully' });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  
  app.get(`/All_details/:id/:email`, async (req, res) => {
    const id = req.params.id;
    const email=req.params.email;
    try {
      
      const personal_info=await pool.query(`SELECT l.mobileno,p.*
FROM public.learners l
JOIN public.learners_personal_info p on l.emailid=p.emailid
where p.emailid=$1`,[email] )

      const academic_info = await pool.query(`SELECT * FROM public.learners_academic_info where enrollment_id=$1 `,[id]) 

        const work_info = await pool.query(`SELECT * FROM public.learners_work_info where enrollment_id=$1 `,[id])
        
        const workInfoWithDates = work_info.rows.map((ele) => {
            return {
              ...ele,
              date_from: format(new Date(ele.date_from), 'dd-MM-yyyy'),
              date_to: format(new Date(ele.date_to), 'dd-MM-yyyy')
            };
          });
          const dob = format(new Date(personal_info.rows[0].dob), 'yyyy-MM-dd')
          
          const token = jwt.sign({personal_info:personal_info.rows[0],
            academic_info:academic_info.rows,
            work_info:workInfoWithDates,
            dob:dob}, SECRET_KEY, { expiresIn: '1h' });

      res.status(200).json(
        { message: 'Saved Successfully',
          // personal_info:personal_info.rows[0],
          // academic_info:academic_info.rows,
          // work_info:workInfoWithDates,
          // dob:dob
          token
       });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  app.get(`/payment_details/:id`, async (req, res) => {
    const id = req.params.id;
    try {
      const pay_info = await pool.query(`SELECT * from public.payment_details where enrollment_id=$1 ORDER BY date_of_payment`,[id])
      const formattedPayInfo = pay_info.rows.map(row => ({
        ...row,
        date_of_payment: format(new Date(row.date_of_payment), 'yyyy-MM-dd')
      }));
      res.status(200).json(
        { message: 'Saved Successfully',
          pay_info:formattedPayInfo,
       });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: 'Server Error' });
    }
  })

app.post('/storePdf/:id', async (req, res) => {
    const id = req.params.id;
    // const { pdfData } = req.body;
    const { pdfData, imageData } = req.body;
    try {
       const client = await pool.connect();
      
              // Create a new PDF document
              const formattedPdfDoc = await PDFDocument.create();
              const personalInfoQuery1 = 'SELECT * FROM public.learners_personal_info WHERE enrollment_id = $1';
              const personalInfoQuery2 = 'SELECT * FROM public.learners_documents WHERE enrollment_id = $1';
              const personalInfoQuery3 = 'SELECT * FROM public.learners_academic_info WHERE enrollment_id = $1';
              const personalInfoQuery4 = 'SELECT * FROM public.learners_work_info WHERE enrollment_id = $1';
              

              const personalInfoResult1 = await client.query(personalInfoQuery1, [id]);
              const personalData = personalInfoResult1.rows[0];
  
              const personalInfoResult2 = await client.query(personalInfoQuery2, [id]);
              const imageData = personalInfoResult2.rows[0];
              const personalInfoResult3 = await client.query(personalInfoQuery3, [id]);
              const academic_info_data = personalInfoResult3;
              const personalInfoResult4 = await client.query(personalInfoQuery4, [id]);
              const work_info_data = personalInfoResult4;

                     

              // Convert binary image data to Buffer
              const imageBuffer = Buffer.from(imageData.photo_file, 'binary');
              const imageBuffer1 = Buffer.from(imageData.signature_file, 'binary');

              // Render the PDF page to an image buffer (PNG in this case)
                const timesRomanFont = await formattedPdfDoc.embedFont(StandardFonts.TimesRoman);
                const timesRomanFontbold = await formattedPdfDoc.embedFont(StandardFonts.TimesRomanBold);
                const image = await formattedPdfDoc.embedJpg(imageBuffer);         
 
  
// Add a new page to the PDF document
const page = formattedPdfDoc.addPage([600, 800]); // Increased height for more space
const { width, height } = page.getSize();
const fontSize = 12;
const lineHeight = fontSize + 6; // Increased line height for better readability
const labelX = 50; // X-coordinate for labels
const valueX = 250; // X-coordinate for values

// Load and embed logo image
const logoUrl = 'NIT.jpg'; // Replace with the path to your logo image
const logoBuffer = require('fs').readFileSync(logoUrl); // Read logo image as buffer
const embeddedLogo = await formattedPdfDoc.embedJpg(logoBuffer);
 

    
    // Function to draw header with logo
    const drawHeader = async(page) => {
      const logoWidth = 30;
      const logoHeight = 30;
      const logoX = 50;
      const logoY = height - 4 * fontSize - logoHeight;

      // Draw the logo
      page.drawImage(embeddedLogo, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });

      // Draw the title next to the logo
      const title = 'National Institute of Technical Teachers Training and Research, Taramani, Chennai'
     
      const titleX = logoX + logoWidth + 10; // Adjust x position to the right of the logo
      const titleY = height - 2 * fontSize; // Adjust y position for proper alignment
      const maxWidth = width - titleX - 50; // Maximum width for the title text

      // Split the title into multiple lines if it exceeds the maximum width
      const titleLines = [];
      let currentLine = '';
      const words = title.split(' ');
      for (const word of words) {
        const testLine = currentLine + word + ' ';
        const testWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth) {
          titleLines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }
      titleLines.push(currentLine.trim());

      // Calculate the total height of the title text
      const totalTitleHeight = titleLines.length * lineHeight;

      // Adjust titleY to center the title vertically
      const centeredTitleY = logoY + (logoHeight - totalTitleHeight) / 2 + lineHeight / 2;

      // Draw each line of the title
      titleLines.forEach((line, index) => {
        page.drawText(line, {
          x: titleX,
          y: centeredTitleY - index * lineHeight,
          size: fontSize,
          font: timesRomanFontbold,
          color: rgb(0, 0.53, 0.71),
        });
      });
  

  // Draw the subtitle below the title
  const subtitle = 'Submitted Application Form Details';
  const subtitleY = centeredTitleY - titleLines.length * lineHeight - 1.5 * lineHeight; // Adjust position below the title
  const subtitleWidth = timesRomanFont.widthOfTextAtSize(subtitle, fontSize * 1.5);
  const subtitleX = (width - subtitleWidth) / 2; // Center the subtitle

  page.drawText(subtitle, {
    x: subtitleX,
    y: subtitleY,
    size: fontSize *1.2,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });

// Draw the image below the subtitle, aligned to the right
 const imageWidth1 = 100;
 const imageHeight1 = 100;
 const imageX1 = width - imageWidth1 - 50; // 50 px margin from the right edge
 const imageY1 = subtitleY - imageHeight1 - 1.5 * lineHeight; // Position below the subtitle
 
 const embeddedImage1 = await formattedPdfDoc.embedJpg(imageBuffer);
 page.drawImage(embeddedImage1, {
   x: imageX1,
   y: imageY1,
   width: imageWidth1,
   height: imageHeight1,
 });

 
};

   // Function to draw footer
    const drawFooter = (page, pageIndex, pageCount) => {
      page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
        x: width / 2 - 50,
        y: 30,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    // Function to draw a border
    const drawBorder = (page) => {
      page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
    };


// Function to draw a table
const drawTable = (page, headers, data, startX, startY, columnWidths, rowHeight) => {
  let currentY = startY;

  // Draw table headers
  headers.forEach((header, index) => {
    page.drawText(header, {
      x: startX + columnWidths[index] / 2,
      y: currentY,
      size: fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
  });

  currentY -= rowHeight;

  // Draw table data
  data.forEach((row) => {
    row.forEach((cell, index) => {
      page.drawText(cell.toString(), {
        x: startX + columnWidths[index] / 2,
        y: currentY,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    });
    currentY -= rowHeight;
  });
};
    
// Draw the image in the top right corner
// const imageWidth1 = 100;
// const imageHeight1 = 100;
// const imageX1 = width - imageWidth - 0; // 50 px margin from the right edge
// const imageY1 = height - imageHeight - 4 * fontSize; // Positioning under the title

// page.drawRectangle({
//   x: imageX,
//   y: imageY,
//   width: imageWidth,
//   height: imageHeight,
//   borderColor: rgb(0, 0, 0),
//   borderWidth: 1,
// });
// const embeddedImage1 = await formattedPdfDoc.embedJpg(imageBuffer);
// page.drawImage(embeddedImage1, {
//   x: imageX,
//   y: imageY,
//   width: imageWidth,
//   height: imageHeight,
// });
  // Draw the subtitle below the title
 
    // Personal information text
    const personalInfoFields = [
      { label: 'Enrollment ID:', value: personalData.enrollment_id},
      { label: 'Name:', value: personalData.name },
      { label: 'Father\'s Name:', value: personalData.father_name },
      { label: 'Mother\'s Name:', value: personalData.mother_name },
      { label: 'Date of Birth:', value: personalData.dob ? personalData.dob.toDateString() : '' }, // Convert Date to string
      { label: 'Gender:', value: personalData.gender },
      { label: 'Category:', value: personalData.category },
      { label: 'Person with Disability:', value: personalData.person_with_disability },
      { label: 'Email-ID:', value: personalData.emailid },
      { label: 'Aadhar Number:', value: personalData.aadhar_number },
      { label: 'City:', value: personalData.city },
      { label: 'State:', value: personalData.state },
      { label: 'Permanent Address:', value: personalData.permanent_address },
      { label: 'Current Address:', value: personalData.current_address },
      { label: 'Department:', value: personalData.department },
      { label: 'Current Experience:', value: personalData.current_experience },
      { label: 'Total Experience:', value: personalData.total_experience },
      { label: 'Head of Organization:', value: personalData.principal_name },
      { label: 'Organization Contact:', value: personalData.institute_contact },
      { label: 'Designation:', value: personalData.designation },
    ];
  

    // Calculate maximum label width for alignment
    const maxLabelWidth = personalInfoFields.reduce((maxWidth, field) => {
      const width = timesRomanFont.widthOfTextAtSize(field.label, fontSize);
      return Math.max(maxWidth, width);
    }, 0);


    // Define starting point for personal info text
    let currentY = height - 12 * fontSize;

    const drawText = (label, value) => {
      if (currentY < 50) { // If there's not enough space for another line, add a new page
        page = formattedPdfDoc.addPage([600, 800]);
        currentY = height - 4 * fontSize;
        drawHeader(page);
        drawBorder(page);
      }
      page.drawText(label, {
        x: labelX,
        y: currentY,
        size: fontSize,
        font: timesRomanFontbold,
        color: rgb(0, 0.53, 0.71),
      });

      const displayValue = value ? value.toString() : "Not Applicable";
      page.drawText(displayValue, { // Convert value to string
        x: labelX + maxLabelWidth + 10, // Add padding for alignment
        y: currentY,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
   

      currentY -= lineHeight;
    };

    // Draw the content
    drawHeader(page);
    drawBorder(page);
    personalInfoFields.forEach(field => drawText(field.label, field.value));   



// Retrieve all rows for the enrollment ID
const rows = academic_info_data.rows;


const drawTableCaption = (page, caption, startX, startY,maxWidth, fontSize, font, color) => {
  page.drawText(caption, {
    x: startX,
    y: startY - 10,
    maxWidth:500,
    size: fontSize,
    font: timesRomanFontbold,
    color: rgb(1, 0, 0),
  });
  return startY - fontSize - 5; // Adjust the Y position for the next elements
};

// Function to draw academic information table
const drawAcademicInfoTable = (page, rows, startX, startY) => {
  const headers = [
    'Qualification Level',
    'Branch',
    'School/College',
    'Board of University',
    'Year of Passing',
    'Percentage',
  ];

  const data = rows.map((row) => [
    row.qualification_level || '',
    row.branch || '',
    row.school_clgname || '',
    row.board_university || '',
    row.year_of_passing ? row.year_of_passing.toString() : '',
    row.percentage ? row.percentage.toString() : '',
  ]);



  const columnWidths = [80, 80, 80, 80, 80, 80]; // Adjust widths as needed
  const startYOffset = 30; // Vertical offset from personal info section
  const fontSize = 12;
  const lineHeight = fontSize + 18;
  const borderWidth = 1;
 
  
  const caption = 'Academic Information';
  startY = drawTableCaption(page, caption, startX, startY,500, fontSize, timesRomanFontbold, rgb(1, 0, 0));

  let currentY = startY - startYOffset;

  // Draw headers with borders, wrapped text, and bold font
  headers.forEach((header, index) => {
    const headerX = startX + sum(columnWidths.slice(0, index));
    const headerY = currentY;
    const headerWidth = columnWidths[index];
    const headerHeight = lineHeight;

    // Draw header background rectangle
    page.drawRectangle({
      x: headerX,
      y: headerY,
      width: headerWidth,
      height: headerHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: borderWidth,
    });

    // Draw wrapped and bold header text with reduced font size
    page.drawText(header, {
      x: headerX + 5, // Adjust for padding
      y: headerY + headerHeight - fontSize, // Adjust for vertical centering
      size: fontSize,
      font: timesRomanFontbold, // Assuming timesRomanFontBold is your bold font
      color: rgb(0, 0.53, 0.71),
      maxWidth: headerWidth - 10, // Adjust maximum width for wrapping
      lineHeight: 12, // Adjust line height for wrapping
      textAlign: 'center', // Align text center horizontally within the cell
      verticalAlign: 'middle', // Align text center vertically within the cell
    });
  });

  currentY -= lineHeight;

  // Draw data rows with borders and reduced font size
  data.forEach((rowData) => {
    rowData.forEach((cell, index) => {
      const cellX = startX + sum(columnWidths.slice(0, index));
      const cellY = currentY;
      const cellWidth = columnWidths[index];
      const cellHeight = lineHeight;

      // Draw cell background rectangle
      page.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellWidth,
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: borderWidth,
      });

      // Draw text in the cell with reduced font size
      page.drawText(cell.toString(), {
        x: cellX + 5, // Adjust for padding
        y: cellY + cellHeight - fontSize, // Adjust for vertical centering
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
        maxWidth: cellWidth - 10, // Adjust maximum width for wrapping
        lineHeight: 12, // Adjust line height for wrapping
        textAlign: 'center', // Align text center horizontally within the cell
        verticalAlign: 'middle', // Align text center vertically within the cell
      });
    });
    currentY -= lineHeight;
  });

  // Draw horizontal grid lines
  let gridY = startY - startYOffset;
  data.forEach(() => {
    page.drawLine({
      start: { x: startX, y: gridY },
      end: { x: startX + sum(columnWidths), y: gridY },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    gridY -= lineHeight;
  });

  // Draw vertical grid lines
  let gridX = startX;
  columnWidths.forEach((width) => {
    page.drawLine({
      start: { x: gridX + width, y: startY - startYOffset },
      end: { x: gridX + width, y: startY - startYOffset - (data.length * lineHeight) },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    gridX += width;
  });
};
// Helper function to calculate sum of array elements
const sum = (arr) => arr.reduce((acc, val) => acc + val, 0);



  // Check if space is enough for the work information table, otherwise add a new page
let academicTableStartY = 600 - (personalInfoFields.length * (10 + 5)); // Adjust workTableStartY based on personal info height
if (academicTableStartY < 50) {
  // Add a new page to the PDF document
const page = formattedPdfDoc.addPage([600, 800]); // Increased height for more space
const { width, height } = page.getSize();
const fontSize = 12;
const lineHeight = fontSize + 6; // Increased line height for better readability
const labelX = 50; // X-coordinate for labels
const valueX = 250; // X-coordinate for values
  academicTableStartY = 700; // New startY for work info on new page
}

  // Draw academic information table
  drawAcademicInfoTable(page, rows, 50, academicTableStartY);


  // Retrieve all rows for the enrollment ID
const rows1 = work_info_data.rows;

// Function to draw academic information table
const drawWorkInfoTable = (page, rows1, startX, startY) => {
  const headers = [
    'Organization Name',
    'Organization Address',
    'Organizaton Designation',
    'From Date',
    'To Date',
    'Organization Type',
  ];

  const fontSize1 = 12;
 
  const caption1 = 'Work Experience Information';
  startY = drawTableCaption(page, caption1, startX, startY,500, fontSize1, timesRomanFontbold, rgb(1, 0, 0));

  const data = rows1.map((row) => [
    row.organisation_name || '',
    row.organisation_address || '',
    row.organisation_designation || '',
    row.date_from ? row.date_from.toDateString() : '',
    row.date_to ? row.date_to.toDateString() : '',
    row.organisation_type  || '',
  ]);

  const columnWidths = [80, 80, 80, 80, 80, 80]; // Adjust widths as needed
  const startYOffset = 30; // Vertical offset from personal info section
  const fontSize = 12;
  const lineHeight = fontSize + 18;
  const borderWidth = 1;

  let currentY = startY - startYOffset;

  // Draw headers with borders, wrapped text, and bold font
  headers.forEach((header, index) => {
    const headerX = startX + sum(columnWidths.slice(0, index));
    const headerY = currentY;
    const headerWidth = columnWidths[index];
    const headerHeight = lineHeight;

    // Draw header background rectangle
    page.drawRectangle({
      x: headerX,
      y: headerY,
      width: headerWidth,
      height: headerHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: borderWidth,
    });

    // Draw wrapped and bold header text with reduced font size
    page.drawText(header, {
      x: headerX + 5, // Adjust for padding
      y: headerY + headerHeight - fontSize, // Adjust for vertical centering
      size: fontSize,
      font: timesRomanFontbold, // Assuming timesRomanFontBold is your bold font
      color: rgb(0, 0.53, 0.71),
      maxWidth: headerWidth - 10, // Adjust maximum width for wrapping
      lineHeight: 12, // Adjust line height for wrapping
      textAlign: 'center', // Align text center horizontally within the cell
      verticalAlign: 'middle', // Align text center vertically within the cell
    });
  });

  currentY -= lineHeight;

  // Draw data rows with borders and reduced font size
  data.forEach((rowData) => {
    rowData.forEach((cell, index) => {
      const cellX = startX + sum(columnWidths.slice(0, index));
      const cellY = currentY;
      const cellWidth = columnWidths[index];
      const cellHeight = lineHeight;

      // Draw cell background rectangle
      page.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellWidth,
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: borderWidth,
      });

      // Draw text in the cell with reduced font size
      page.drawText(cell.toString(), {
        x: cellX + 5, // Adjust for padding
        y: cellY + cellHeight - fontSize, // Adjust for vertical centering
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
        maxWidth: cellWidth - 10, // Adjust maximum width for wrapping
        lineHeight: 12, // Adjust line height for wrapping
        textAlign: 'center', // Align text center horizontally within the cell
        verticalAlign: 'middle', // Align text center vertically within the cell
      });
    });
    currentY -= lineHeight;
  });

  // Draw horizontal grid lines
  let gridY = startY - startYOffset;
  data.forEach(() => {
    page.drawLine({
      start: { x: startX, y: gridY },
      end: { x: startX + sum(columnWidths), y: gridY },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    gridY -= lineHeight;
  });

  // Draw vertical grid lines
  let gridX = startX;
  columnWidths.forEach((width) => {
    page.drawLine({
      start: { x: gridX + width, y: startY - startYOffset },
      end: { x: gridX + width, y: startY - startYOffset - (data.length * lineHeight) },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    gridX += width;
  });
};
// Helper function to calculate sum of array elements
const sum1 = (arr) => arr.reduce((acc, val) => acc + val, 0);



  // Check if space is enough for the work information table, otherwise add a new page
let workTableStartY = 600 - (drawAcademicInfoTable.length * (200)); // Adjust workTableStartY based on personal info height
if (workTableStartY < 50) {
 // Add a new page to the PDF document
const page1 = formattedPdfDoc.addPage([600, 800]); // Increased height for more space
const { width, height } = page.getSize();
const fontSize = 12;
const lineHeight = fontSize + 6; // Increased line height for better readability
const labelX = 50; // X-coordinate for labels
const valueX = 250; // X-coordinate for values
  workTableStartY = 700; // New startY for work info on new page
    // Draw academic information table
    drawWorkInfoTable(page1, rows1, 50, workTableStartY);
    const caption2 = `Declaration: I hereby declare that the information provided in this application is true and accurate to the best of my knowledge.I understand that any false information may result may result in the rejection of my application or termination of my admission`;
    startY = drawTableCaption(page1, caption2, 50, 400, 500,fontSize, timesRomanFontbold, rgb(1, 0, 0));
    const embeddedImage2 = await formattedPdfDoc.embedJpg(imageBuffer1);
    page1.drawImage(embeddedImage2, {
      x: 400,
      y: 300,
      width: 60,
      height: 20,
    });
}
else
{
   workTableStartY = 700;
  drawWorkInfoTable(page, rows1, 50, workTableStartY);
}



    // Add footer to all pages
    const pageCount = formattedPdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const currentPage = formattedPdfDoc.getPage(i);
      drawFooter(currentPage, i, pageCount);
    }

                
              // Copy pages from the provided PDF
              // const providedPages = await formattedPdfDoc.copyPages(formattedPdfDoc, formattedPdfDoc.getPageIndices());
              // providedPages.forEach(page => formattedPdfDoc.addPage(page));
      
              // Save the formatted PDF
              const formattedPdfBytes = await formattedPdfDoc.save();

              // const query1 = 'UPDATE public.learners_documents SET personal_info_pdf = NULL WHERE enrollment_id = $1';
              // const values1 = [id];           
              // await client.query(query1, values1);
              const query = 'UPDATE public.learners_documents SET personal_info_pdf = $1 WHERE enrollment_id = $2';
              const values = [formattedPdfBytes, id];

              await client.query(query, values);
              client.release();
      
      
      res.status(200).send('PDF stored successfully');
    } catch (err) {
      console.error('Error storing PDF:', err);
      res.status(500).send('Error storing PDF');
    }
  });

app.post('/payment', async (req, res) => {
  const { academic_program, course, department, reference_number, date_of_payment, amount_paid, id } = req.body;
  try {
    
    const r_query = await pool.query('SELECT reference_number FROM public."payment_details" WHERE  reference_number= $1', [reference_number]);
          if(r_query.rowCount===1)
            throw error

    const query = `
      INSERT INTO payment_details (academic_program, department, reference_number, date_of_payment, amount_paid, enrollment_id, course)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const values = [academic_program, department, reference_number, date_of_payment, amount_paid, id, course];
    const result = await pool.query(query, values);
    const dept = {
      'M.Tech. in Infrastructure Engineering and Management (Regular)': 'MI',
      'M.Tech. in Mechatronics (Regular)': 'MM',
      'M.Tech. in VLSI Design and Embedded Systems (Regular)': 'MVE',
      'M.Tech. in Power Electronics and Drives (Regular)': 'MPE',
      'M.Tech. in Artificial Intelligence and Machine Learning (Regular)': 'MAIML',
      'M.Tech. in Augmented and Virtual Reality (Regular)': 'MVR',
      'M.Tech. in Engineering Education (Regular)': 'MEE',
      'M.B.A. in Business Analytics (Regular)': 'MBA',
      'PG Diploma - Entrepreneurship (Regular)':'PGE',
        'PG Diploma - AI & ML (Regular)':'PGML',
        'PG Diploma Guidance and counseling (Regular)':'PGG',

        'M.B.A General Management':'MBAG',

      'Civil Engineering (Regular)':'CE',
            'Mechanical Engineering (Regular)':'ME',
            'Electrical & Electronics Engineering (Regular)':'EEE',
            'Electrical & Communication Engineering (Regular)':'ECE',
            'Computer Science and Engineering (Regular)':'CSE',
            'Media Science & Technology (Regular)':'MS',
            'Education/Engineering Education (Regular)':'EDU',
            'Management (Regular)':'MT',

            'M.Tech. in Infrastructure Engineering and Management (Working)': 'MI',
            'M.Tech. in Mechatronics (Working)': 'MM',
            'M.Tech. in VLSI Design and Embedded Systems (Working)': 'MVE',
            'M.Tech. in Power Electronics and Drives (Working)': 'MPE',
            'M.Tech. in Artificial Intelligence and Machine Learning (Working)': 'MAIML',
            'M.Tech. in Augmented and Virtual Reality (Working)': 'MVR',
            'M.Tech. in Engineering Education (Working)': 'MEE',
            'M.B.A. in Business Analytics (Working)': 'MBA',
            'PG Diploma - Entrepreneurship (Working)':'PGE',
              'PG Diploma - AI & ML (Working)':'PGML',
              'PG Diploma Guidance and counseling (Working)':'PGG',

              'M.B.A General Management':'MBAG',

            'Civil Engineering (Working)':'CE',
                  'Mechanical Engineering (Working)':'ME',
                  'Electrical & Electronics Engineering (Working)':'EEE',
                  'Electrical & Communication Engineering (Working)':'ECE',
                  'Computer Science and Engineering (Working)':'CSE',
                  'Media Science & Technology (Working)':'MS',
                  'Education/Engineering Education (Working)':'EDU',
                  'Management (Working)':'MT',
            
    };
    const dep_code = dept[course];

    const countResult = await pool.query(`SELECT count(*) FROM public.payment_details WHERE enrollment_id=$1;`, [id]);
    const count = parseInt(countResult.rows[0].count, 10);

    const applicationNumber = `${dep_code}${id}${count}`;
    await pool.query(`UPDATE public.payment_details
      SET application_number = $1
      WHERE id = $2;`, [applicationNumber,result.rows[0].id]);
    res.status(200).json({ success: true,applicationNumber });
  } catch (error) {
    console.error('Error inserting payment details:', error);
    res.status(500).json({ success: false, message: 'Failed to insert payment details' });
  }
});

app.get('/personal_info_status/:id',async(req,res)=>{
    const id=req.params.id;
    try {
        const result=await pool.query(`SELECT status from public."learners_personal_info" where enrollment_id=$1`,[id]);
        res.status(200).json({status:result.rows[0].status})
    } catch (error) {
        console.log(error);
    }
})

app.post('/status_update/:id', async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
  
    try {
      const result = await pool.query('UPDATE public."learners_personal_info" SET status=$1 WHERE enrollment_id=$2', [status, id]);
      res.status(200).json({result:result, message: 'Saved successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ message: 'Failed to save status' });
    }
  });
  
  
// Login route
app.post('/login', async (req, res) => {
    const { email_id, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM public."learners" where emailid=$1', [email_id]);
        const enrollment_id = await pool.query('SELECT enrollment_id FROM public."learners_personal_info" where emailid=$1', [email_id]);
        if (user.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        // if (password !== user.rows[0].pass_word) {
        //     return res.status(400).json({ msg: 'Invalid Credentials' });
        // }

        // User authenticated successfully

        const payload = { userr: user.rows[0], enrollment: enrollment_id.rows[0]};
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

        res.json({
            msg: 'Login successful',
            token
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/all_applicants', async (req, res) => {
  try {
    const Applicant_info = await pool.query(`SELECT 
    p.application_number,
    l.emailid,
    p.enrollment_id,
    p.academic_program,
    p.course,
    p.department,
    p.reference_number,
    p.date_of_payment,
    p.amount_paid,
    p.status
FROM 
    public.payment_details p
    join public.learners_personal_info l
    on p.enrollment_id = l.enrollment_id 
    where l.emailid not in ('cdsubha@gmail.com', 'cdsubhalakshmi@gmail.com', 'csubha1010@gmail.com',
    'll@gmail.com', 'sasirekhainfo@gmail.com', 'srinivasan2010639@ssn.edu.in', 'sasirekha@nitttrc.edu.in', 'kk@gmail.com',
    'basheerahmedshaik28@gmail.com', 'test@gmail.com', 'parthiban.d1207@gmail.com', 'bksooraj@gmail.com', 'ssasirekha@gmail.com',
    'sasirekhassn@gmail.com', 'u_natesan@yahoo.com', 'parthiban2010699@ssn.edu.in', 'ss@gmail.com',
    'seshu.babu08@gmail.com', 'super@gmail.com', 'mm@gmail.com', 'vv@gmail.com', 'jj@gmail.com', 'nb@gmail.com',
    'tamilmani0890@gmail.com', 'seshubabu@nitttrc.edu.in', 'bcv@gmail.com', 'rajeswari@nitttrc.edu.in', 'spanuji@gmail.com', 'tamilmani@nitttrc.edu.in', 'wewugeda@polkaroad.net')
ORDER BY 
    p.date_of_payment DESC;
    `)
    const formattedPayInfo = Applicant_info.rows.map(row => ({
      ...row,
      date_of_payment: format(new Date(row.date_of_payment), 'dd-MM-yy')
    }));
    res.status(200).json(
      { message: 'Fetched Successfully',
        Applicant_info:formattedPayInfo,
     });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Server Error'});
  }
})

app.post('/export_to_csv',async (req, res) => {
    const client = await pool.connect();
    try {
      const stream = client.query(copyTo(`COPY (
        WITH aq AS (
    SELECT enrollment_id,
           JSON_AGG(
               JSON_BUILD_OBJECT(
                   'School/CollegeName', school_clgname,
                   'branch', branch,
                   'Board/University', board_university,
                   'Year of Passing', year_of_passing,
                   'Percentage', percentage,
                   'Qualification level', qualification_level
               )
           ) AS "Academic Qualifications"
    FROM learners_academic_info
    GROUP BY enrollment_id
    ORDER BY enrollment_id
),
wq AS (
    SELECT enrollment_id,
           JSON_AGG(
               JSON_BUILD_OBJECT(
                   'Organisation Name', organisation_name,
                   'Organisation address', organisation_address,
                   'Organisation Designation', organisation_designation,
                   'Date From', date_from,
                   'Date To', date_to,
                   'Organisation Type', organisation_type
               )
           ) AS "Work Qualifications"
    FROM learners_work_info
    GROUP BY enrollment_id
    ORDER BY enrollment_id
),
pd AS (
    SELECT enrollment_id,
           JSON_AGG(
               JSON_BUILD_OBJECT(
                   'Reference Number', reference_number,
                   'Application Number', application_number,
				   'Academic Program', academic_program,
                   'Course', course,
				   'Department',department,
                   'Date of Payment', date_of_payment,
                   'Amount Paid', amount_paid
               )
           ) AS "Payment details"
    FROM payment_details
    GROUP BY enrollment_id
    ORDER BY enrollment_id
)
SELECT lp.*,l.*,aq.enrollment_id, 
       aq."Academic Qualifications", 
       wq."Work Qualifications",
	   pd."Payment details"
FROM aq
LEFT JOIN wq ON aq.enrollment_id = wq.enrollment_id
JOIN pd ON aq.enrollment_id = pd.enrollment_id
JOIN learners_personal_info lp on aq.enrollment_id = lp.enrollment_id
JOIN learners l on l.emailid=lp.emailid 
WHERE l.emailid NOT IN('cdsubha@gmail.com', 'cdsubhalakshmi@gmail.com', 'csubha1010@gmail.com',
    'll@gmail.com', 'sasirekhainfo@gmail.com', 'srinivasan2010639@ssn.edu.in', 'sasirekha@nitttrc.edu.in', 'kk@gmail.com',
    'basheerahmedshaik28@gmail.com', 'test@gmail.com', 'parthiban.d1207@gmail.com', 'bksooraj@gmail.com', 'ssasirekha@gmail.com',
    'sasirekhassn@gmail.com', 'u_natesan@yahoo.com', 'parthiban2010699@ssn.edu.in', 'ss@gmail.com',
    'seshu.babu08@gmail.com', 'super@gmail.com', 'mm@gmail.com', 'vv@gmail.com', 'jj@gmail.com', 'nb@gmail.com',
    'tamilmani0890@gmail.com', 'seshubabu@nitttrc.edu.in', 'bcv@gmail.com', 'rajeswari@nitttrc.edu.in', 'spanuji@gmail.com', 'tamilmani@nitttrc.edu.in', 'wewugeda@polkaroad.net')
ORDER BY aq.enrollment_id
        ) TO STDOUT WITH CSV HEADER`));

        let csvData = '';

        stream.on('data', chunk => {
            csvData += chunk.toString();
        });

        stream.on('end', () => {
            res.header('Content-Type', 'text/csv');
            res.attachment('nitttr_users.csv');
            res.send(csvData);
            client.release();
        });

        stream.on('error', err => {
            console.error('Error exporting data to CSV:', err);
            res.status(500).send('Error exporting data to CSV');
            client.release();
        });

      // const fileStream = fs.createWriteStream('C:/Users/parth/OneDrive/Desktop/docker/nitttr_users.csv');
      
      // stream.pipe(fileStream);
      // stream.on('end', () => {
      //   console.log('CSV file has been written successfully');
      //   client.release();
      // });
      // res.status(200).send({message:'CSV have been saved successfully'})
    } catch (err) {
      console.error('Error exporting data to CSV:', err);
      client.release();
    }
})

app.get('/registered_learners_info', async (req, res) => {
  try {
    const Applicant_info = await pool.query(`SELECT 
    enrollment_id,
    state,
    city,
    emailid
    FROM 
    public.learners_personal_info
    where emailid not in ('cdsubha@gmail.com', 'cdsubhalakshmi@gmail.com', 'csubha1010@gmail.com',
    'll@gmail.com', 'sasirekhainfo@gmail.com', 'srinivasan2010639@ssn.edu.in', 'sasirekha@nitttrc.edu.in', 'kk@gmail.com',
    'basheerahmedshaik28@gmail.com', 'test@gmail.com', 'parthiban.d1207@gmail.com', 'bksooraj@gmail.com', 'ssasirekha@gmail.com',
    'sasirekhassn@gmail.com', 'u_natesan@yahoo.com', 'parthiban2010699@ssn.edu.in', 'ss@gmail.com',
    'seshu.babu08@gmail.com', 'super@gmail.com', 'mm@gmail.com', 'vv@gmail.com', 'jj@gmail.com', 'nb@gmail.com',
    'tamilmani0890@gmail.com', 'seshubabu@nitttrc.edu.in', 'bcv@gmail.com', 'rajeswari@nitttrc.edu.in', 'spanuji@gmail.com', 'tamilmani@nitttrc.edu.in', 'wewugeda@polkaroad.net')
    ORDER BY 
    enrollment_id;
    `)
    res.status(200).json(
      { message: 'Fetched Successfully',
        Applicant_info:Applicant_info.rows
     });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Server Error'});
  }
})

async function combineFilesToPDF(files) {
    const combinedDoc = await PDFDocument.create();
    const pdfKeys = [
      'tenthCertificate','twelthCertificate', 'ugCertificate', 'ugMarksheet', 
      'workExperiencePdf', 'noObjectionCertificate', 
      'categoryCertificate',
      //  'photoFile', 'signatureFile'
    ];
  
    for (let key of pdfKeys) {
      if (files[key] && files[key].length > 0) {
        const pdfBytes = files[key][0].buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = await combinedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => combinedDoc.addPage(page));
      }
    }
  
    return combinedDoc.save();
  }

  app.post('/mergePdfs/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Fetch personal_info_pdf and combined_pdf from the database
        const client = await pool.connect();
        
        const personalInfoQuery = 'SELECT personal_info_pdf FROM public.learners_documents WHERE enrollment_id = $1';
        const combinedPdfQuery = 'SELECT combined_pdf FROM public.learners_documents WHERE enrollment_id = $1';
        
        const personalInfoResult = await client.query(personalInfoQuery, [id]);
        const combinedPdfResult = await client.query(combinedPdfQuery, [id]);
        
        const personalInfoPdf = personalInfoResult.rows[0].personal_info_pdf;
        const combinedPdf = combinedPdfResult.rows[0].combined_pdf;

        client.release();

        if (!personalInfoPdf || !combinedPdf) {
            return res.status(404).send('One or both PDFs not found');
        }

        // Load PDFs
        const personalInfoPdfDoc = await PDFDocument.load(personalInfoPdf);
        const combinedPdfDoc = await PDFDocument.load(combinedPdf);

        // Create a new PDF document
        const mergedPdfDoc = await PDFDocument.create();

        // Copy pages from personal_info_pdf
        const personalInfoPages = await mergedPdfDoc.copyPages(personalInfoPdfDoc, personalInfoPdfDoc.getPageIndices());
        personalInfoPages.forEach((page) => mergedPdfDoc.addPage(page));

        // Copy pages from combined_pdf
        const combinedPages = await mergedPdfDoc.copyPages(combinedPdfDoc, combinedPdfDoc.getPageIndices());
        combinedPages.forEach((page) => mergedPdfDoc.addPage(page));

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdfDoc.save();

        // Optionally store the merged PDF back in the database
        const updateQuery = 'UPDATE public.learners_documents SET combined_pdf = $1 WHERE enrollment_id = $2';
        await client.query(updateQuery, [mergedPdfBytes, id]);

        res.status(200).send('PDFs merged and saved successfully');
    } catch (error) {
        console.error('Error merging PDFs:', error);
        res.status(500).send('Error merging PDFs');
    }
});

  
  
  // async function insertFilesIntoDatabase(enrollmentId, files) {
  //   const {
  //     tenthCertificate,twelthCertificate, ugCertificate, ugMarksheet, 
  //     workExperiencePdf, noObjectionCertificate, 
  //     categoryCertificate, photoFile, signatureFile,
  //   } = files;
    
  //   const insertQuery = `
  //     UPDATE public."learners_documents" SET
  //       tenth_certificate=$1,twelth_certificate=$2, ug_certificate=$3, 
  //       ug_marksheet=$4, work_experience_pdf=$5, no_objection_certificate=$6, 
  //       category_certificate=$7, photo_file=$8, signature_file=$9
  //     where enrollment_id=$10
  //   `;
    
  //   const values = [
  //     tenthCertificate ? tenthCertificate[0].buffer : null,
  //     twelthCertificate ? twelthCertificate[0].buffer : null,
  //     ugCertificate ? ugCertificate[0].buffer : null,
  //     ugMarksheet ? ugMarksheet[0].buffer : null,
  //     workExperiencePdf ? workExperiencePdf[0].buffer : null,
  //     noObjectionCertificate ? noObjectionCertificate[0].buffer : null,
  //     categoryCertificate ? categoryCertificate[0].buffer : null,
  //     photoFile ? photoFile[0].buffer : null,
  //     signatureFile ? signatureFile[0].buffer : null,
  //     enrollmentId?enrollmentId:null
  //   ];
  
  //   await pool.query(insertQuery, values);
  // }

  app.post('/upload/:id', upload.fields([
    { name: 'tenthCertificate', maxCount: 1 },
    { name: 'twelthCertificate', maxCount: 1 },
    { name: 'ugCertificate', maxCount: 1 },
    { name: 'ugMarksheet', maxCount: 1 },
    { name: 'workExperiencePdf', maxCount: 1 },
    { name: 'noObjectionCertificate', maxCount: 1 },
    { name: 'categoryCertificate', maxCount: 1 },
    { name: 'photoFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const enrollmentId = req.params.id;

      // Combine selected files into a single PDF
      const combinedDoc = await combineFilesToPDF(req.files);

      // Insert files into individual columns in the database
      await insertFilesIntoDatabase(enrollmentId, req.files);

      // Update the combined PDF in the database
      await pool.query(`
        UPDATE public."learners_documents"
        SET combined_pdf = $1
        WHERE enrollment_id = $2
      `, [combinedDoc, enrollmentId]);

      res.status(200).send('Files uploaded and processed successfully.');
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).send('Failed to upload files.');
    }
  });

async function insertFilesIntoDatabase(enrollmentId, files) {
    const {
      tenthCertificate, twelthCertificate, ugCertificate, ugMarksheet, 
      workExperiencePdf, noObjectionCertificate, 
      categoryCertificate, photoFile, signatureFile,
    } = files;

    // Only include optional files if they are present
    const insertQuery = `
      UPDATE public."learners_documents" SET
        tenth_certificate=$1,
        twelth_certificate=$2,
        ug_certificate=$3,
        ug_marksheet=$4,
        work_experience_pdf=$5,
        no_objection_certificate=$6,
        category_certificate=$7,
        photo_file=$8,
        signature_file=$9
      WHERE enrollment_id=$10
    `;
    
    const values = [
      tenthCertificate ? tenthCertificate[0].buffer : null,
      twelthCertificate ? twelthCertificate[0].buffer : null,
      ugCertificate ? ugCertificate[0].buffer : null,
      ugMarksheet ? ugMarksheet[0].buffer : null,
      workExperiencePdf ? workExperiencePdf[0].buffer : null,
      noObjectionCertificate ? noObjectionCertificate[0].buffer : null,
      categoryCertificate ? categoryCertificate[0].buffer : null,
      photoFile ? photoFile[0].buffer : null,
      signatureFile ? signatureFile[0].buffer : null,
      enrollmentId
    ];

    await pool.query(insertQuery, values);
}

  
  app.post('/upload/:id', upload.fields([
    { name: 'tenthCertificate', maxCount: 1 },
    { name: 'twelthCertificate', maxCount: 1 },
    { name: 'ugCertificate', maxCount: 1 },
    { name: 'ugMarksheet', maxCount: 1 },
    { name: 'workExperiencePdf', maxCount: 1 },
    { name: 'noObjectionCertificate', maxCount: 1 },
    { name: 'categoryCertificate', maxCount: 1 },
    { name: 'photoFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const enrollmentId = req.params.id;
  
      // Combine selected files into a single PDF
      const combinedDoc = await combineFilesToPDF(req.files);
  
      // Insert files into individual columns in the database
      await insertFilesIntoDatabase(enrollmentId, req.files);

      await pool.query(`
        UPDATE public."learners_documents"
        SET combined_pdf = $1
        WHERE enrollment_id = $2
      `, [combinedDoc, enrollmentId]);
  
      res.status(200).send('Files uploaded and processed successfully.');
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).send('Failed to upload files.');
    }
  });

app.get('/view-combined-pdf/:id', async (req, res) => {
    const documentId = req.params.id;
    try {
        const client = await pool.connect();
        // Query database for combined PDF data
        const query = (`SELECT combined_pdf FROM public.learners_documents WHERE enrollment_id = $1`);
        const result = await client.query(query,[documentId]);
        const combined_pdf= result.rows[0].combined_pdf;

        // Send combined PDF as a response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="combined.pdf"`);
        res.send(combined_pdf);

        client.release();
    } catch (error) {
        console.error('Error fetching combined PDF from database', error);
        res.status(500).send('Error fetching combined PDF from database');
    }
});
// app.get('/view-personal-pdf/:id', async (req, res) => {
//     const documentId = req.params.id;
//     console.log(documentId)
//     try {
//         const client = await pool.connect();
//         // Query database for combined PDF data
//         const query = (`SELECT personal_info_pdf FROM public.learners_documents WHERE enrollment_id = $1`);
//         const result = await client.query(query,[documentId]);
//         console.log(result)
//         const combined_pdf= result.rows[0].combined_pdf;

//         // Send combined PDF as a response
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `inline; filename="combined.pdf"`);
//         res.send(combined_pdf);

//         client.release();
//     } catch (error) {
//         console.error('Error fetching combined PDF from database', error);
//         res.status(500).send('Error fetching combined PDF from database');
//     }
// });

app.get('/viewPdf/:id', async (req, res) => {
    const id = req.params.id;
  
    try {
      const client = await pool.connect();
      
      const query = 'SELECT combined_pdf FROM public."learners_documents" WHERE enrollment_id = $1';
      const result = await client.query(query, [id]);
  
      if (result.rows.length > 0) {
        const pdfData = result.rows[0].combined_pdf;
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfData);
      } else {
        res.status(404).send('PDF not found');
      }
  
      client.release();
    } catch (err) {
      console.error('Error fetching PDF:', err);
      res.status(500).send('Error fetching PDF');
    }
  });

app.listen(5000,()=> {
    console.log('Server started Up');
});

app.delete('/delete_academic_info/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const {qualification_level}=req.body;
      const response = await pool.query(`DELETE FROM public.learners_academic_info WHERE enrollment_id=$1 
        and qualification_level=$2`,[id,qualification_level])
        res.send(response);
    } catch (error) {
      console.error('Error deleting :', error);
      res.status(500).send('Error deleting record');
    }
})

app.delete('/delete_work_info/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {organisation_name}=req.body;
    const response = await pool.query(`DELETE FROM public.learners_work_info WHERE enrollment_id=$1 
      and organisation_name=$2`,[id,organisation_name])
      res.send(response);
  } catch (error) {
    console.error('Error deleting :', error);
    res.status(500).send('Error deleting record');
  }
})

app.get('/image/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await pool.query('SELECT photo_file FROM learners_documents WHERE id = $1', [id]);
      if (result.rows.length > 0) {
          const imageData = result.rows[0].image_data;
          res.writeHead(200, {
              'Content-Type': 'image/jpeg',
              'Content-Length': imageData.length,
          });
          res.end(imageData);
      } else {
          res.status(404).send('Image not found');
      }
  } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).send('Server error');
  }
});

app.post('/save_image', async (req, res) => {
  try {
      const result = await pool.query(`SELECT d.enrollment_id,d.photo_file FROM learners_documents d
        JOIN payment_details p on d.enrollment_id = p.enrollment_id
          where d.enrollment_id not in ('24070009', '24070021', '24070002',
    '24070082','24070096','24070097','2407022','2407023',
    '2407024','24070001','24070006','24070003',
    '24070005','24070007','24070011','24070010',
    '24070012','24070008','24070013','24070014','24070016',
    '24070017','24070018','24070019','24070020','24070054','24070076','24070045')
        `);
      result.rows.forEach((row) => {
          if (!row.photo_file) {
              console.error(`No data found for image ID ${row.id}`);
              return;
          }
          const filePath = path.join(imagesDir, `image_${row.enrollment_id}.jpg`);
          const imageBuffer = Buffer.isBuffer(row.photo_file) ? row.photo_file : Buffer.from(row.photo_file);
          fs.writeFileSync(filePath, imageBuffer);
      });
      res.status(200).json({ message: 'Images saved successfully' });
  } catch (error) {
      console.error('Error fetching images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/save_image2', async (req, res) => {
  try {
      const result = await pool.query(`SELECT d.enrollment_id,d.signature_file FROM learners_documents d
        JOIN payment_details p on d.enrollment_id = p.enrollment_id
          where d.enrollment_id not in ('24070009', '24070021', '24070002',
    '24070082','24070096','24070097','2407022','2407023',
    '2407024','24070001','24070006','24070003',
    '24070005','24070007','24070011','24070010',
    '24070012','24070008','24070013','24070014','24070016',
    '24070017','24070018','24070019','24070020','24070054','24070076','24070045')
        `);
      result.rows.forEach((row) => {
          if (!row.signature_file) {
              console.error(`No data found for image ID ${row.id}`);
              return;
          }
          const filePath = path.join(imagesDir2, `sign_${row.enrollment_id}.jpg`);
          const imageBuffer = Buffer.isBuffer(row.signature_file) ? row.signature_file : Buffer.from(row.signature_file);
          fs.writeFileSync(filePath, imageBuffer);
      });
      res.status(200).json({ message: 'Images saved successfully' });
  } catch (error) {
      console.error('Error fetching images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/download_image', (req, res) => {
  
  try {
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read image directory' });
        }
        const zip = archiver('zip');
        res.attachment('images.zip');
        zip.pipe(res);
        files.forEach(file => {
            zip.file(path.join(imagesDir, file), { name: file });
        });
        zip.finalize();
    });
  } catch (error) {
    console.log(error)
  }
});

app.get('/download_image2', (req, res) => {
  try {
      fs.readdir(imagesDir2, (err, files) => {
          if (err) {
              console.error('Error reading signature directory:', err);
              return res.status(500).json({ error: 'Unable to read signature directory' });
          }
          if (!files.length) {
              console.error('No signature files found');
              return res.status(404).json({ error: 'No signatures found in the directory' });
          }
          const zip = archiver('zip');
          res.attachment('sign.zip');
          zip.pipe(res);
          files.forEach(file => {
              console.log('Adding signature file to zip:', file);
              zip.file(path.join(imagesDir2, file), { name: file });
          });
          zip.finalize();
      });
  } catch (error) {
      console.error('Error during signature zipping:', error);
      res.status(500).json({ error: 'An error occurred while preparing the signatures' });
  }
});

app.post('/Setexam', async (req, res) => {
  const { id,status } = req.body;
  try {
    const result = await pool.query('UPDATE public."payment_details" SET status=$1 WHERE application_number=$2', [status, id]);
    res.status(200).json({result:result, message: 'Saved successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to save status' });
  }
});

// app.get(`/hall_ticket/:id`, async (req, res) => {
//   const id = req.params.id;
//   console.log(id)
//   try {
//     const hall_ticket_info = await pool.query(`SELECT 
//     p.enrollment_id,
//     lp.name,
//     lp.dob,
//     STRING_AGG(DISTINCT lai.branch, ',') AS field_of_studies,
//     STRING_AGG(DISTINCT p.application_number, ',') AS application_numbers,
//     STRING_AGG(DISTINCT p.course, ',') AS courses
// FROM 
//     payment_details p
//     JOIN learners_personal_info lp ON p.enrollment_id = lp.enrollment_id
//     JOIN learners_academic_info lai ON p.enrollment_id = lai.enrollment_id
//     JOIN learners_documents ld ON lp.enrollment_id = ld.enrollment_id 
// WHERE 
//     p.enrollment_id NOT IN ('24070009', '24070021', '24070002',
//                             '24070082', '24070096', '24070097', '2407022', '2407023',
//                             '2407024', '24070001', '24070006', '24070003',
//                             '24070005', '24070007', '24070011', '24070010',
//                             '24070012', '24070013', '24070014', '24070016',
//                             '24070017', '24070018', '24070019', '24070020', '24070054', '24070076', '24070045')
//     AND lai.qualification_level IN ('B.E/B.TECH', 'Others', 'Diploma')
//     AND p.enrollment_id =$1
// GROUP BY 
//     p.enrollment_id, lp.name, lp.dob 
// ORDER BY 
//     p.enrollment_id;
//  `,[id])
//     console.log(hall_ticket_info.rows)
//     const formattedPayInfo = hall_ticket_info.rows.map(row => ({
//       ...row,
//       dob: format(new Date(row.dob), 'dd-MM-yyyy')
//     }));
//     res.status(200).json(
//       { message: 'Saved Successfully',
//         hall_ticket_info:formattedPayInfo,
//      });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: 'Server Error' });
//   }
// })

app.get(`/hall_ticket/:id`, async (req, res) => {
  const id = req.params.id;
  console.log(id);
  try {
    const hall_ticket_info = await pool.query(`
WITH LatestCourse AS (
    SELECT 
        enrollment_id,
        branch,
        year_of_passing,
        ROW_NUMBER() OVER (PARTITION BY enrollment_id ORDER BY year_of_passing DESC) AS rn
    FROM 
        learners_academic_info
    WHERE 
        qualification_level IN ('B.E/B.TECH', 'Others', 'Diploma')
)
SELECT 
    p.enrollment_id,
    lp.name,
    lp.dob,
    lc.branch,
    ld.photo_file,
    STRING_AGG(DISTINCT p.application_number, ',') AS application_numbers,
    STRING_AGG(DISTINCT p.course, ',') AS courses
FROM 
    payment_details p
    JOIN learners_personal_info lp ON p.enrollment_id = lp.enrollment_id
    JOIN LatestCourse lc ON p.enrollment_id = lc.enrollment_id AND lc.rn = 1
    JOIN learners_documents ld ON lp.enrollment_id = ld.enrollment_id 
WHERE 
    p.enrollment_id = $1 -- Use placeholder for parameter
    AND p.enrollment_id NOT IN ('24070009', '24070021', '24070002',
                                '24070082', '24070096', '24070097', '2407022', '2407023',
                                '2407024', '24070001', '24070006', '24070003',
                                '24070005', '24070007', '24070011', '24070010',
                                '24070012', '24070013', '24070014', '24070016',
                                '24070017', '24070018', '24070019', '24070020', '24070054', '24070076', '24070045')
GROUP BY 
    p.enrollment_id, lp.name, lp.dob, lc.branch,ld.photo_file
ORDER BY 
    p.enrollment_id;
`, [id]); // Pass parameters as an array
    console.log(hall_ticket_info.rows);
    const formattedPayInfo = hall_ticket_info.rows.map(row => ({
      ...row,
      dob: format(new Date(row.dob), 'dd-MM-yyyy')
    }));
    res.status(200).json({
      message: 'Saved Successfully',
      hall_ticket_info: formattedPayInfo,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post(`/hall_ticket_update/:id`, async (req, res) => {
  const id = req.params.id;
  console.log(id);
  try {
    const hall_ticket_info = await pool.query(`
      UPDATE public.payment_details SET hall_ticket_status = 'YES' where enrollment_id=$1;
`, [id]); // Pass parameters as an array
    console.log(hall_ticket_info);
    res.status(200).json({
      message: 'Saved Successfully',
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/save_pdf', async (req, res) => {
  try {
      const query = `
        SELECT d.enrollment_id, d.combined_pdf 
        FROM learners_documents d
        JOIN payment_details p on d.enrollment_id = p.enrollment_id
        WHERE d.enrollment_id NOT IN (
          '24070009', '24070021', '24070002', '24070082', '24070096', 
          '24070097', '2407022', '2407023', '2407024', '24070001',
          '24070006', '24070003', '24070005', '24070007', '24070011',
          '24070010', '24070012', '24070013', '24070014',
          '24070016', '24070017','24070008','24070018', '24070019', '24070020',
          '24070054', '24070076', '24070045'
        ) and d.combined_pdf is not null 
        and p.course like 'M.Tech. in VLSI Design and Embedded Systems%';
      `;
      console.log('Executing query:', query);

      const result = await pool.query(query);
      console.log('Result Rows:', result.rows);

      if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir);
      }

      result.rows.forEach((row) => {
          if (!row.combined_pdf) {
              console.error(`No PDF data found for enrollment ID ${row.enrollment_id}`);
              return;
          }
          const filePath = path.join(pdfDir, `VLSI_${row.enrollment_id}.pdf`);
          const pdfBuffer = Buffer.from(row.combined_pdf); // Convert bytea to Buffer
          fs.writeFileSync(filePath, pdfBuffer);
      });

      res.status(200).json({ message: 'PDFs saved successfully' });
  } catch (error) {
      console.error('Error fetching PDFs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/download_pdf', (req, res) => {
  try {
    fs.readdir(pdfDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read PDF directory' });
        }
        const zip = archiver('zip');
        res.attachment('documents.zip');
        zip.pipe(res);
        files.forEach(file => {
            zip.file(path.join(pdfDir, file), { name: file });
        });
        zip.finalize();
    });
  } catch (error) {
    console.error('Error downloading PDFs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// app.get(`/course_details`, async (req, res) => {
//     const id = req.params.id;
//     try {
//       const pay_info = await pool.query(`SELECT * from public.payment_details where enrollment_id=$1 ORDER BY date_of_payment`,[id])
//       const formattedPayInfo = pay_info.rows.map(row => ({
//         ...row,
//         date_of_payment: format(new Date(row.date_of_payment), 'yyyy-MM-dd')
//       }));
//       res.status(200).json(
//         { message: 'Saved Successfully',
//           pay_info:formattedPayInfo,
//        });
//     } catch (error) {
//       console.log(error.message);
//       res.status(500).json({ message: 'Server Error' });
//     }
//   })

  app.post('/course_register', async (req, res) => {
    console.log(req.body)
    const { CourseName, CourseType,Department,CourseCredits} = req.body;
    try {
        const result = await pool.query(`INSERT INTO public.nitttr_course_details(course_name,course_type,department_id,course_credits) VALUES ($1,$2,$3,$4) RETURNING course_id`, [CourseName, CourseType,Department,CourseCredits]);
        const id = result.rows[0].course_id;
        res.json({
            msg: 'Registration successful',
            id:id
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/course_details', async (req, res) => {
  try {
      const result = await pool.query(`SELECT * FROM public.nitttr_course_details order by course_id`);
      res.json({
          msg: 'Registration successful',
          rows:result.rows
      });
  } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
  }
});

app.get('/nitttr_lms_departments', async (req, res) => {
  try {
      const result = await pool.query(`SELECT * FROM public.nitttr_lms_departments order by department_id`);
      res.json({
          msg: 'departments successful',
          rows:result.rows
      });
  } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
  }
});