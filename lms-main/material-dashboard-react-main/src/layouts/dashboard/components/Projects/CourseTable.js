import { useEffect, useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import config from "config";
import Data from "./data";

const CourseTable=() => {
    // const { columns, rows } = data();
    const [menu, setMenu] = useState(null);
    const[rows,SetRows]=useState([])
    const openMenu = ({ currentTarget }) => setMenu(currentTarget);
    const closeMenu = () => setMenu(null);

  const renderMenu = (
    <Menu
      id="simple-menu"
      anchorEl={menu}
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={Boolean(menu)}
      onClose={closeMenu}
    >
      <MenuItem onClick={closeMenu}>Action</MenuItem>
      <MenuItem onClick={closeMenu}>Another action</MenuItem>
      <MenuItem onClick={closeMenu}>Something else</MenuItem>
    </Menu>
  );

  const getDetails = async()=>{
    // arr.push({'Course Name':CourseName,'Course Type':CourseType,'Department':Department,'Course Credits':CourseCredits});
    try {
     const response = await fetch (`http://${config.BASE_URL_IP}/course_details`,{
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json();
      SetRows(result.rows)
      console.log(result.rows)
      if(response.ok){
        console.log(result.msg,result.rows)
      }
    } catch (error) {
      console.log(error)
    }
}

    useEffect(()=>{
        getDetails();
    },[])

  return (
    <Card>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
        <MDBox>
          <MDTypography variant="h6" gutterBottom>
            Courses
          </MDTypography>
          <MDBox display="flex" alignItems="center" lineHeight={0}>
            <Icon
              sx={{
                fontWeight: "bold",
                color: ({ palette: { info } }) => info.main,
                mt: -0.5,
              }}
            >
              done
            </Icon>
            <MDTypography variant="button" fontWeight="regular" color="text">
              &nbsp;<strong>30 Credits</strong> Completed
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox color="text" px={2}>
          <Icon sx={{ cursor: "pointer", fontWeight: "bold" }} fontSize="small" onClick={openMenu}>
            more_vert
          </Icon>
        </MDBox>
        {renderMenu}
      </MDBox>
      <MDBox>
      </MDBox>
      <Data/>
    </Card>
  );
}

export default CourseTable;
