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
  Link,
  InputAdornment,
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
    instanceId: "",
    publicIp: "",
    publicDns: "",
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
        process.env.REACT_APP_DEPLOY_API,
        { subdomain: formData.subdomain },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response_1);
      const { instanceId, publicIp, publicDns } = response_1?.data?.data;
      setActiveStep(1);

      console.log(instanceId, publicIp, publicDns);
      const response_2 = await axios.post(
        process.env.REACT_APP_SUBDOMAIN_API,
        {
          subdomain: formData.subdomain,
          instanceId: instanceId,
          publicDns: publicDns,
          publicIp: publicIp,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(response_2);
      setActiveStep(2);

      const response_3 = await axios.post(
        "https://api.smtp2go.com/v3/email/send",
        {
          api_key: process.env.REACT_APP_SMTP_API_KEY,
          to: [formData.email],
          sender: "NoReply@pmtracker.io",
          subject: "Your task manager has been created",
          text_body: `Your new task manager is live now, please check this URL: https://${formData.subdomain}.pmtracker.io`,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Email sent successfully:", response_3);
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
            Deployment completed successfully!
            <br />
            Click <Link href={`${formData.subdomain}.pmtracker.io`}>
              here
            </Link>{" "}
            to start with your new task manager.
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
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">.pmtracker.io</InputAdornment>
                  ),
                },
              }}
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
