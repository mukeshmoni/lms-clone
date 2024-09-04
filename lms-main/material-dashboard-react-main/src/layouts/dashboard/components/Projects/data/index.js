import Tooltip from "@mui/material/Tooltip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDProgress from "components/MDProgress";

// Images
// import logoXD from "assets/images/small-logos/logo-xd.svg";
// import logoAtlassian from "assets/images/small-logos/logo-atlassian.svg";
// import logoSlack from "assets/images/small-logos/logo-slack.svg";
// import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
// import logoJira from "assets/images/small-logos/logo-jira.svg";
// import logoInvesion from "assets/images/small-logos/logo-invision.svg";
// import team1 from "assets/images/team-1.jpg";
// import team2 from "assets/images/team-2.jpg";
// import team3 from "assets/images/team-3.jpg";
// import team4 from "assets/images/team-4.jpg";
import { useState,useEffect } from "react";
import config from "config";
import DataTable from "./../../../../../examples/Tables/DataTable";

const Data = () => {
  const [rows, setRows] = useState([]);
  const [Departments,setDepartments]=useState([]);

  const Courses = ({ name }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDTypography variant="button" fontWeight="medium" ml={0} lineHeight={3}>
        {name}
      </MDTypography>
    </MDBox>
  );

  const getDetails = async () => {
    try {
      const response = await fetch(`http://${config.BASE_URL_IP}/course_details`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (response.ok) {
        setRows(result.rows || []); // Ensure rows is at least an empty array
        console.log(result.msg, result.rows);
      }
    } catch (error) {
      console.log(error);
    }
  };

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

  useEffect(() => {
    getDetails();
    getdepartments();
  }, []);

  const columns = [
    { Header: "CourseName", accessor: "CourseName", width: "45%", align: "left" },
    { Header: "CourseType", accessor: "CourseType", width: "10%", align: "center" },
    { Header: "Department", accessor: "Department", align: "center" },
    { Header: "CourseCredits", accessor: "CourseCredits", align: "center" },
  ];

  console.log(rows);

  const formattedRows = rows?.map((row) => {
    const department = Departments?.find(dept => dept.department_id === row.department_id);
  
    return {
      CourseName: <Courses name={row.course_name} />,
      CourseType: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {row.course_type}
        </MDTypography>
      ),
      Department: department ? (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {department.department_name}
        </MDTypography>
      ) : null,
      CourseCredits: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {row.course_credits}
        </MDTypography>
      ),
    };
  });
  

  return (
    <DataTable
      table={{ columns, rows: formattedRows }} // Ensure rows is not undefined
      showTotalEntries={false}
      isSorted={true}
      noEndBorder
      entriesPerPage={false}
    />
  );
};

export default Data;