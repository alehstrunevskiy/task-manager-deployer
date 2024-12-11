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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { CirclesWithBar } from "react-loader-spinner";

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
  "Verifying Subdomain name",
  "Creating New Instance",
  "Deploying to Subdomain",
  "Sending Notification Email",
];

function validateSubdomain(subdomain) {
  // Regular expression for valid subdomain names
  const regex = /^[a-z0-9-_]+$/;

  return regex.test(subdomain);
}

const DeploymentForm = () => {
  const [formData, setFormData] = useState({
    subdomain: "",
    email: "",
    instanceId: "",
    publicIp: "",
    publicDns: "",
    superadminEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubdomainValid, setIsSubdomainValid] = useState(true);
  const [isPendingModalOpened, setIsPendingModalOpened] = useState(true);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Validate subdomain on input change
    if (e.target.name === "subdomain") {
      setIsSubdomainValid(validateSubdomain(e.target.value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSubdomainValid) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    setActiveStep(0);
    setIsPendingModalOpened(true);

    try {
      const url = `https://dns.google/resolve?name=${formData.subdomain}.${process.env.REACT_APP_DOMAIN}&type=A`;

      const response_1 = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response_1);
      if (response_1?.data?.Answer) {
        throw new Error("Subdomain name is already in use.");
      }
      setActiveStep(1);

      const response_2 = await axios.post(
        process.env.REACT_APP_DEPLOY_API,
        {
          subdomain: formData.subdomain,
          superadminEmail: formData.superadminEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response_2);
      const { instanceId, publicIp, publicDns } = response_2?.data?.data;
      setActiveStep(2);

      console.log(instanceId, publicIp, publicDns);
      const response_3 = await axios.post(
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
      console.log(response_3);
      setActiveStep(3);

      const response_4 = await axios.post(
        "https://api.smtp2go.com/v3/email/send",
        {
          api_key: process.env.REACT_APP_SMTP_API_KEY,
          to: [formData.email, "info@tkabe.com"],
          sender: "NoReply@pmtracker.io",
          subject: "Your task manager has been created",
          text_body: `A new task manager is live now, please check this URL: https://${formData.subdomain}.${process.env.REACT_APP_DOMAIN}`,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Email sent successfully:", response_4);
      setActiveStep(4);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsPendingModalOpened(false);
    }
  };

  return (
    <>
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
              Click{" "}
              <Link
                href={`${formData.subdomain}.${process.env.REACT_APP_DOMAIN}/auth/register.php`}
              >
                here
              </Link>{" "}
              to start by registering superadmin.
            </Alert>
          )}

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
                error={!isSubdomainValid}
                helperText="Subdomain names must be all lower case letters, or numbers, no spaces, allowed special characters - hyphen and underscore."
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography color="textPrimary">
                          .{process.env.REACT_APP_DOMAIN}
                        </Typography>
                      </InputAdornment>
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

              <TextField
                fullWidth
                label="Email for superadmin"
                name="superadminEmail"
                type="email"
                value={formData.superadminEmail}
                onChange={handleChange}
                required
                variant="outlined"
                helperText="This email will be added for superadmin of Task manager"
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
      <Dialog
        open={isPendingModalOpened}
        // onClose={handleCancel}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          <Box display={"flex"} gap={2} alignItems={"center"}>
            Deploying...
            <CirclesWithBar
              height="24"
              width="24"
              color="#4fa94d"
              outerCircleColor="#4fa94d"
              innerCircleColor="#4fa94d"
              barColor="#4fa94d"
              ariaLabel="circles-with-bar-loading"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Typography fontSize={14}>
            Please keep this browser window or tab open until the process is
            completed. The process may take 3~4 minutes.
          </Typography>
        </DialogContent>
        {/* <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions> */}
      </Dialog>
    </>
  );
};

export default DeploymentForm;
