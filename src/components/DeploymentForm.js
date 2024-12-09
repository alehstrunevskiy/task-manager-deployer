import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  Container,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  borderRadius: theme.spacing(2),
  boxShadow: "0 3px 10px rgb(0 0 0 / 0.2)",
}));

const FormContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
}));

const steps = [
  "Creating EC2 Instance",
  "Creating Subdomain",
  "Sending Notification Email",
];

const DeploymentForm = () => {
  const [formData, setFormData] = useState({
    subdomain: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setActiveStep(0);

    try {
      const response_1 = await axios.post(
        "https://zhwmafylcth7lqjerghxej75ay0njrdd.lambda-url.us-east-2.on.aws/",
        { subdomain: formData.subdomain },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response_1);
      const { instanceId, publicIp, publicDns } = response_1.data;
      setFormData({
        ...formData,
        instanceId: instanceId,
        publicIp: publicIp,
        publicDns: publicDns,
      });
      setActiveStep(1);

      const response_2 = await axios.post(
        "https://4wbux5zav5bigeudeptxd6at5i0gsyhz.lambda-url.us-east-2.on.aws/",
        {
          subdomain: formData.subdomain,
          instanceId: formData.instanceId,
          publicIp: formData.publicIp,
          publicDns: formData.publicDns,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(response_2);
      setActiveStep(2);

      // const response_3 = await post({
      //   apiName: "sendNotificationEmail",
      //   path: "/",
      //   options: {
      //     body: formData,
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //   },
      // });
      setActiveStep(3);

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Deploy Task Manager
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Deployment started successfully!
          </Alert>
        )}

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit}>
          <FormContainer>
            <TextField
              fullWidth
              label="Subdomain"
              name="subdomain"
              value={formData.subdomain}
              onChange={handleChange}
              required
              variant="outlined"
              helperText="Enter your desired subdomain"
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="outlined"
              helperText="Notifications will be sent to this email"
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={20} /> : <CloudUploadIcon />
              }
              sx={{ mt: 2 }}
            >
              {loading ? "Deploying..." : "Deploy Task Manager"}
            </Button>
          </FormContainer>
        </form>
      </StyledPaper>
    </Container>
  );
};

export default DeploymentForm;
