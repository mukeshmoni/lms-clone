import { useEffect, useState } from "react";

// @mui material components
import Card from "@mui/material/Card";

import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "../../components/MDInput";
import MDButton from "../../components/MDButton";
import { Margin } from "@mui/icons-material";
import config from "../../config";
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';

const Inputform= () => {
    const [CourseName,setCourseName]=useState('');
    const[CourseType,setCourseType]=useState('');
    const[Department,setDepartment]=useState('');
    const[CourseCredits,setCourseCredits]=useState('');
    const[arr,setArr]=useState([])
    const [Departments,setDepartments]=useState([]);

    const handleChange = (e) => {
      setDepartment(e.target.value);
    };

    const onSubmit = async()=>{
          // arr.push({'Course Name':CourseName,'Course Type':CourseType,'Department':Department,'Course Credits':CourseCredits});
          try {
            console.log(CourseName, CourseType,Department,CourseCredits)
            const response = await fetch (`http://${config.BASE_URL_IP}/course_register`,{
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ CourseName, CourseType,Department,CourseCredits})
            })
            const result = await response.json();
            if(response.ok){
              console.log(result.msg,result.id)
            }
          } catch (error) {
            console.log(error)
          }
    }

    const getdepartments = async()=>{

      try {
        const response = await fetch (`http://${config.BASE_URL_IP}/nitttr_lms_departments`,{
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        const result = await response.json();
        if(response.ok){
          console.log(result.msg,result.rows)
          setDepartments(result.rows)
        }
      } catch (error) {
        console.log(error)
      }
}

  useEffect(()=>{
    getdepartments();
  },[])

  return (
    <Card sx={{ p: 3, mx: "auto", mt: 4 }}>
      <Box
        display="grid"
        gridTemplateColumns="repeat(2, 1fr)"
        gap={2}
        padding={3} // spacing between inputs
      >
        <MDInput type="text" label="Course Name" fullWidth value={CourseName} onChange={(e)=>{setCourseName(e.target.value)}}/>
        <MDInput type="text" label="Course Type" fullWidth value={CourseType} onChange={(e)=>{setCourseType(e.target.value)}}/>
        <MDInput type="text" label="Course Credits" fullWidth value={CourseCredits} onChange={(e)=>{setCourseCredits(e.target.value)}}/>
        <FormControl fullWidth>
          <InputLabel id="department-label">Department</InputLabel>
          <Select
            labelId="department-label"
            id="department-select"
            value={Department}
            onChange={handleChange}
            label="Department"
            sx={{height:'100%'}}
          >
            {
              Departments?.map((dept,index)=>{
                return(
                  <MenuItem key={index} value={dept.department_id}>{dept.department_name}</MenuItem>
                )
              })
            }
          </Select>
        </FormControl>
        {/* <MDInput type="search" label="Search" fullWidth /> */}
        {/* <MDInput type="email" label="Email" fullWidth />
        <MDInput type="password" label="Password" fullWidth />
        <MDInput type="date" label="Date" value="2018-11-23" fullWidth /> */}
      </Box>
        <MDButton variant='contained' color="info" sx={{width:"20%",margin:'0 auto',display:'inline'}} onClick={()=>{onSubmit()}}>Submit</MDButton>
    </Card>
  );    
}

export default Inputform;
