import { useState } from "react";

const LoginPage = ({
    data,
    setData,
    errors,
    status,
    onSubmit,
    onSwitchToRegister,
}) => {
    // const [showPassword, setShowPassword] = useState(false);

    // Each time when a change is noticed in any input field, update the data state
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        console.log(data);
        setData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    return (
        <form className="needs-validation" noValidate onSubmit={onSubmit}>
            <h2 className="section-title mb-3">Welcome Back</h2>
            <p className="mb-3 login-page-text">
                Login to continue your learning journey on{" "}
                <strong>EdStream</strong>.
            </p>

            {/* Status message */}
            {status && (
                <div
                    className={`alert ${status.type === "success" ? "alert-success" : "alert-danger"} fade show mb-3`}
                    role="alert"
                >
                    {status.message}
                </div>
            )}

            <div className="row g-3">
                {/* Email */}
                <div className="col-12">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        className={`form-control soft-input ${errors.email ? "is-invalid" : ""}`}
                        name="email"
                        value={data.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                    />
                    {errors.email && (
                        <div className="invalid-feedback">{errors.email}</div>
                    )}
                </div>

                {/* Password with show/hide */}
                <div className="col-12">
                    {/* <div className="d-flex justify-content-between align-items-center"> */}
                    <label className="form-label ">Password</label>
                    <input
                        type="password"
                        className={`form-control soft-input ${errors.password ? "is-invalid" : ""}`}
                        name="password"
                        value={data.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                    />
                    {errors.password && (
                        <div className="invalid-feedback">
                            {errors.password}
                        </div>
                    )}
                </div>

                {/* switch to register */}
                <div className="col-12 d-flex align-items-center justify-content-between">
                    <button
                        type="button"
                        className="btn btn-link link-muted"
                        onClick={onSwitchToRegister}
                    >
                        New here? Register
                    </button>
                </div>

                {/* Submit */}
                <div className="col-12 mt-2">
                    <button type="submit" className="btn gradient-btn w-100">
                        Login
                    </button>
                </div>
            </div>
        </form>
    );
};

export default LoginPage;
