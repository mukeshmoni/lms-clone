import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "./../../examples/Footer";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

import Projects from "./components/Projects";
import Inputform from "./Inputform";

import OrdersOverview from "./components/OrdersOverview";

import SimpleBlogCard from "./../../examples/Cards/BlogCards/SimpleBlogCard"
import study from './../../assets/images/study.jpg';
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import CourseTable from "./components/Projects/CourseTable";

function Dashboard2() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={10}>
        <MDBox>
        
      <MDBox py={2} px={4} display="flex" justifyContent="flex-end" alignItems="center">
        <MDButton variant="gradient" color="success">
          Add a New course
        </MDButton>
      </MDBox>

          <Grid container spacing={5}>
            <Grid item xs={12} md={6} lg={12}>
              <Inputform />
            </Grid>
            <Grid item xs={12} md={6} lg={12}>
              <CourseTable/>
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer/>
    </DashboardLayout>
  );
}

export default Dashboard2;
